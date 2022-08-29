import { FaceTecFaceScanResultCallback, FaceTecSessionResult, FaceTecIDScanResult, FaceTecIDScanResultCallback } from "joset/FaceTecPublicApi";
import { FaceTecSDK } from "joset";
import api from "./utils/api";

class FaceTecProcess {
    private successCb: (data: any) => void;
    private errorCb: (data: any) => void;
    private intermediaryCb: (data: any) => void;
    private sessionToken: any;

    constructor(
        loader: any,
        successCb: (data: any) => void,
        errorCb: (data: any) => void,
        intermediaryCb: (data: any) => void,
    ) {
        {
            this.successCb = successCb;
            this.errorCb = errorCb;
            this.intermediaryCb = intermediaryCb;
            FaceTecSDK.setResourceDirectory("/FaceTec_resources");
            FaceTecSDK.setImagesDirectory("/FaceTec_images");
            Promise.all([
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.data'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.wasm'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8_cache.wasm')
            ]).then((res) => Promise.all(res.map(val => val.blob()))
            ).then(() => {
                this.getKeys(loader);
            }).catch(() => {
                this.getKeys(loader);
            })
        }
    }

    private async getKeys(loader: any) {
        try {
            if (this.sessionToken) {
                this.livenessCheckProcessor(this.sessionToken);
            } else {
                const response = await api.get("/v1/tigo/dar/trusted/ekyc/keys");
                const data = response.data;
                const status = response.status;
                if (status === 200 && data?.body?.deviceKeyIdentifier && data?.body?.publicFaceMapEncryptionKey && data?.body?.sdkEncryptionKeyBrowser) {
                    this.intermediaryCb({ type: "getKeys", data });
                    loader(false);
                    this.initiateFacetec(data?.body?.deviceKeyIdentifier, data?.body?.publicFaceMapEncryptionKey, data?.body?.sdkEncryptionKeyBrowser);
                } else {
                    this.errorCb({ type: "getKeys", err: data });
                    loader(false);
                }
            }
        } catch (err) {
            console.log(err)
            console.log(this)
            this.errorCb({ type: "getKeys", err });
            loader(false);
        }
    }

    private async initiateFacetec(deviceKeyIdentifier: string, publicFaceMapEncryptionKey: string, sdkEncryptionKeyBrowser: string) {
        const getSessionToken = this.getSessionToken;
        const intermediaryCb = this.intermediaryCb;
        const errorCb = this.errorCb;
        FaceTecSDK.initializeInProductionMode(
            sdkEncryptionKeyBrowser,
            deviceKeyIdentifier,
            publicFaceMapEncryptionKey,
            function (initializedSuccessfully) {
                if (initializedSuccessfully) {
                    intermediaryCb({ type: "initiateFacetec" });
                    getSessionToken();
                } else {
                    errorCb({ type: "initiateFacetec" });
                }
            });
    }

    private async getSessionToken() {
        try {
            const response = await api.get("/v1/tigo/dar/trusted/ekyc/session-tokens");
            const data = response.data;
            const status = response.status;
            if (status === 200 && data?.body?.sessionToken) {
                this.intermediaryCb({ type: "getSessionToken", data });
                this.sessionToken = data?.body?.sessionToken;
                this.livenessCheckProcessor(data?.body?.sessionToken)
            } else {
                this.errorCb({ type: "getSessionToken", err: data });
            }
        } catch (err) {
            this.errorCb({ type: "getSessionToken", err });
        }
    }

    private livenessCheckProcessor(sessionToken: string) {
        const errorCb = this.errorCb;
        const livelinessCheck = this.livelinessCheck;
        const idScanCheck = this.idScanCheck;
        const successCb = this.successCb;
        const intermediaryCb = this.intermediaryCb;
        let sdkResult: any;
        try {
            function processSessionResultWhileFaceTecSDKWaits(sessionResult: FaceTecSessionResult, faceScanResultCallback: FaceTecFaceScanResultCallback) {
                sdkResult = sessionResult;
                if (sessionResult.status !== FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
                    errorCb({ type: "sessionError", err: FaceTecSDK.FaceTecSessionStatus[sessionResult.status] });
                    faceScanResultCallback.cancel();
                    return;
                }
                livelinessCheck(sessionResult, faceScanResultCallback);
            }

            function processIDScanResultWhileFaceTecSDKWaits(idScanResult: FaceTecIDScanResult, idScanResultCallback: FaceTecIDScanResultCallback) {
                sdkResult = idScanResult;
                if (idScanResult.status !== FaceTecSDK.FaceTecIDScanStatus.Success) {
                    errorCb({ type: "idSessionError", err: FaceTecSDK.FaceTecIDScanStatus[idScanResult.status] });
                    idScanResultCallback.cancel();
                    return;
                }
                idScanCheck(idScanResult, idScanResultCallback);
            }

            function onFaceTecSDKCompletelyDone() {
                successCb(sdkResult);
                FaceTecSDK.unload(() => {
                    intermediaryCb({ type: "Facetec Unload Done" });
                })
            }

            new FaceTecSDK.FaceTecSession({ onFaceTecSDKCompletelyDone, processSessionResultWhileFaceTecSDKWaits, processIDScanResultWhileFaceTecSDKWaits }, sessionToken);
        } catch (err) {
            this.errorCb({ type: "getSessionToken", err });
        }
    }

    private async livelinessCheck(sessionResult: any, faceScanResultCallback: any) {
        try {
            const parameters = {
                faceScan: sessionResult.faceScan,
                auditTrailImage: sessionResult.auditTrail[0],
                lowQualityAuditTrailImage: sessionResult.lowQualityAuditTrail[0]
            };
            const config = {
                onUploadProgress: this.uploadProcess(faceScanResultCallback.uploadProgress)
            }
            const response = await api.post("/v1/tigo/dar/trusted/ekyc/live-facemaps", parameters, config);
            const data = response.data;
            const status = response.status;
            if (status === 200 && data?.body?.scanResultBlob) {
                this.intermediaryCb({ type: "livelinessCheck", data });
                faceScanResultCallback.proceedToNextStep(data.body.scanResultBlob);
            } else {
                this.errorCb({ type: "livelinessCheck", err: data });
            }
        } catch (err) {
            this.errorCb({ type: "livelinessCheck", err });
        }
    }

    private async idScanCheck(idScanResult: any, idScanResultCallback: any) {
        try {
            const parameters: { [key: string]: any } = {
                idScan: idScanResult.idScan
            };

            if (idScanResult.frontImages && idScanResult.frontImages[0]) {
                parameters.idScanFrontImage = idScanResult.frontImages[0];
            }

            if (idScanResult.backImages && idScanResult.backImages[0]) {
                parameters.idScanBackImage = idScanResult.backImages[0];
            }

            const config = {
                onUploadProgress: this.uploadProcess(idScanResultCallback.uploadProgress)
            }

            const response = await api.post("/v1/tigo/dar/trusted/ekyc/document-scans", parameters, config);
            const data = response.data;
            const status = response.status;
            if (status === 200 && data?.body?.scanResultBlob) {
                this.intermediaryCb({ type: "idScanCheck", data });
                idScanResultCallback.proceedToNextStep(data?.body?.scanResultBlob);
            } else {
                this.errorCb({ type: "idScanCheck", err: data });
            }
        } catch (err) {
            this.errorCb({ type: "idScanCheck", err });
        }
    }

    private uploadProcess = (uploadProgress: any) => (event: any) => {
        const progress = event.loaded / event.total;
        uploadProgress(progress);
    }
}

export default FaceTecProcess;
