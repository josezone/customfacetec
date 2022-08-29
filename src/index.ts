import { FaceTecFaceScanResultCallback, FaceTecSessionResult, FaceTecIDScanResult, FaceTecIDScanResultCallback } from "joset/FaceTecPublicApi";
import { FaceTecSDK } from "joset";
import api from "./utils/api";

class FaceTecProcess {
    constructor(
        loader: any,
        successCb: (data: any) => void,
        errorCb: (data: any) => void,
        intermediaryCb: (data: any) => void,
        sessionToken: any,
        setSessionToken: any
    ) {
        {
            FaceTecSDK.setResourceDirectory("/FaceTec_resources");
            FaceTecSDK.setImagesDirectory("/FaceTec_images");
            Promise.all([
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.data'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.wasm'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8_cache.wasm')
            ]).then((res) => Promise.all(res.map(val => val.blob()))
            ).then(() => {
                this.getKeys(loader, successCb, errorCb, intermediaryCb, sessionToken, setSessionToken);
            }).catch(() => {
                this.getKeys(loader, successCb, errorCb, intermediaryCb, sessionToken, setSessionToken);
            })
        }
    }

    private async getKeys(loader: any, successCb: any, errorCb: any, intermediaryCb: any, sessionToken: any, setSessionToken: any) {
        try {
            if (sessionToken) {
                this.livenessCheckProcessor(sessionToken, successCb, errorCb, intermediaryCb);
            } else {
                const response = await api.get("/v1/tigo/dar/trusted/ekyc/keys");
                const data = response.data;
                const status = response.status;
                if (status === 200 && data?.body?.deviceKeyIdentifier && data?.body?.publicFaceMapEncryptionKey && data?.body?.sdkEncryptionKeyBrowser) {
                    intermediaryCb({ type: "getKeys", data });
                    loader(false);
                    this.initiateFacetec(data?.body?.deviceKeyIdentifier, data?.body?.publicFaceMapEncryptionKey, data?.body?.sdkEncryptionKeyBrowser, successCb, errorCb, intermediaryCb, setSessionToken);
                } else {
                    errorCb({ type: "getKeys", err: data });
                    loader(false);
                }
            }
        } catch (err) {
            errorCb({ type: "getKeys", err });
            loader(false);
        }
    }

    private async initiateFacetec(deviceKeyIdentifier: string, publicFaceMapEncryptionKey: string, sdkEncryptionKeyBrowser: string, successCb: any, errorCb: any, intermediaryCb: any, setSessionToken: any) {
        const getSessionToken = this.getSessionToken;
        FaceTecSDK.initializeInProductionMode(
            sdkEncryptionKeyBrowser,
            deviceKeyIdentifier,
            publicFaceMapEncryptionKey,
            function (initializedSuccessfully) {
                if (initializedSuccessfully) {
                    intermediaryCb({ type: "initiateFacetec" });
                    getSessionToken(successCb, errorCb, intermediaryCb, setSessionToken);
                } else {
                    errorCb({ type: "initiateFacetec" });
                }
            });
    }

    private async getSessionToken(successCb: any, errorCb: any, intermediaryCb: any, setSessionToken: any) {
        try {
            const response = await api.get("/v1/tigo/dar/trusted/ekyc/session-tokens");
            const data = response.data;
            const status = response.status;
            if (status === 200 && data?.body?.sessionToken) {
                intermediaryCb({ type: "getSessionToken", data });
                setSessionToken(data?.body?.sessionToken);
                this.livenessCheckProcessor(data?.body?.sessionToken, successCb, errorCb, intermediaryCb)
            } else {
                errorCb({ type: "getSessionToken", err: data });
            }
        } catch (err) {
            console.log(err)
            console.log(this)
            errorCb({ type: "getSessionToken", err });
        }
    }

    private livenessCheckProcessor(sessionToken: string, successCb: any, errorCb: any, intermediaryCb: any) {
        const livelinessCheck = this.livelinessCheck;
        const idScanCheck = this.idScanCheck;
        let sdkResult: any;
        try {
            function processSessionResultWhileFaceTecSDKWaits(sessionResult: FaceTecSessionResult, faceScanResultCallback: FaceTecFaceScanResultCallback) {
                sdkResult = sessionResult;
                if (sessionResult.status !== FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
                    errorCb({ type: "sessionError", err: FaceTecSDK.FaceTecSessionStatus[sessionResult.status] });
                    faceScanResultCallback.cancel();
                    return;
                }
                livelinessCheck(sessionResult, faceScanResultCallback, errorCb, intermediaryCb);
            }

            function processIDScanResultWhileFaceTecSDKWaits(idScanResult: FaceTecIDScanResult, idScanResultCallback: FaceTecIDScanResultCallback) {
                sdkResult = idScanResult;
                if (idScanResult.status !== FaceTecSDK.FaceTecIDScanStatus.Success) {
                    errorCb({ type: "idSessionError", err: FaceTecSDK.FaceTecIDScanStatus[idScanResult.status] });
                    idScanResultCallback.cancel();
                    return;
                }
                idScanCheck(idScanResult, idScanResultCallback, errorCb, intermediaryCb);
            }

            function onFaceTecSDKCompletelyDone() {
                successCb(sdkResult);
                FaceTecSDK.unload(() => {
                    intermediaryCb({ type: "Facetec Unload Done" });
                })
            }

            new FaceTecSDK.FaceTecSession({ onFaceTecSDKCompletelyDone, processSessionResultWhileFaceTecSDKWaits, processIDScanResultWhileFaceTecSDKWaits }, sessionToken);
        } catch (err) {
            errorCb({ type: "getSessionToken", err });
        }
    }

    private async livelinessCheck(sessionResult: any, faceScanResultCallback: any, errorCb: any, intermediaryCb: any) {
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
                intermediaryCb({ type: "livelinessCheck", data });
                faceScanResultCallback.proceedToNextStep(data.body.scanResultBlob);
            } else {
                errorCb({ type: "livelinessCheck", err: data });
            }
        } catch (err) {
            errorCb({ type: "livelinessCheck", err });
        }
    }

    private async idScanCheck(idScanResult: any, idScanResultCallback: any, errorCb: any, intermediaryCb: any) {
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
                intermediaryCb({ type: "idScanCheck", data });
                idScanResultCallback.proceedToNextStep(data?.body?.scanResultBlob);
            } else {
                errorCb({ type: "idScanCheck", err: data });
            }
        } catch (err) {
            errorCb({ type: "idScanCheck", err });
        }
    }

    private uploadProcess = (uploadProgress: any) => (event: any) => {
        const progress = event.loaded / event.total;
        uploadProgress(progress);
    }
}

export default FaceTecProcess;
