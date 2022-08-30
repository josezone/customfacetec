const axios = require('axios');
const { FaceTecSDK } = require('./facetec/FaceTecSDK');

const api = axios.create({
    withCredentials: true,
    headers: {
        Accept: 'application/json',
        'Access-Control-Allow-Origin': '*',
    },
});

export const facetec = async (
    loader,
    intermediaryCb,
    sessionToken,
    setSessionToken
) => {
    try {
        FaceTecSDK.setResourceDirectory("/FaceTec_resources");
        FaceTecSDK.setImagesDirectory("/FaceTec_images");
        const resourceResolve = await Promise.all([
            fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.data'),
            fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.wasm'),
            fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8_cache.wasm')
        ])
        await Promise.all(resourceResolve.map(val => val.blob()));
        if (!sessionToken) {
            const response = await api.get("/v1/tigo/dar/trusted/ekyc/keys");
            if (response &&
                response.status === 200 &&
                response.data &&
                response.data.body &&
                response.data.body.deviceKeyIdentifier &&
                response.data.body.publicFaceMapEncryptionKey &&
                response.data.body.sdkEncryptionKeyBrowser) {
                loader(false);
                intermediaryCb({ type: "getKeys", response });
                FaceTecSDK.initializeInProductionMode(
                    response.data.body.sdkEncryptionKeyBrowser,
                    response.data.body.deviceKeyIdentifier,
                    response.data.body.publicFaceMapEncryptionKey,
                    async (initializedSuccessfully) => {
                        if (initializedSuccessfully) {
                            intermediaryCb({ type: "initiateFacetec" });
                            const response2 = await api.get("/v1/tigo/dar/trusted/ekyc/session-tokens");
                            if (response2 &&
                                response2.status === 200 &&
                                response2.data &&
                                response2.data.body &&
                                response2.data.body.sessionToken) {
                                intermediaryCb({ type: "getSessionToken", response: response2 });
                                setSessionToken(response2.data.body.sessionToken);
                                let sdkResult;
                                const processSessionResultWhileFaceTecSDKWaits = async (sessionResult, faceScanResultCallback) => {
                                    sdkResult = sessionResult;
                                    if (sessionResult.status !== FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
                                        faceScanResultCallback.cancel();
                                        return;
                                    }
                                    const parameters = {
                                        faceScan: sessionResult.faceScan,
                                        auditTrailImage: sessionResult.auditTrail[0],
                                        lowQualityAuditTrailImage: sessionResult.lowQualityAuditTrail[0]
                                    };
                                    const config = {
                                        onUploadProgress: (event) => {
                                            const progress = event.loaded / event.total;
                                            faceScanResultCallback.uploadProgress(progress);
                                        }
                                    }
                                    const response3 = await api.post("/v1/tigo/dar/trusted/ekyc/live-facemaps", parameters, config);
                                    if (response3 &&
                                        response3.status === 200 &&
                                        response3.data &&
                                        response3.data.body &&
                                        response3.data.body.scanResultBlob) {
                                        intermediaryCb({ type: "livelinessCheck", response: response3 });
                                        faceScanResultCallback.proceedToNextStep(data.body.scanResultBlob);
                                    } else {
                                        Promise.reject({ type: "livelinessCheck", err: response3 });
                                    }
                                }

                                const processIDScanResultWhileFaceTecSDKWaits = async (idScanResult, idScanResultCallback) => {
                                    sdkResult = idScanResult;
                                    if (idScanResult.status !== FaceTecSDK.FaceTecIDScanStatus.Success) {
                                        idScanResultCallback.cancel();
                                        return;
                                    }
                                    const parameters2 = {
                                        idScan: idScanResult.idScan
                                    };

                                    if (idScanResult.frontImages && idScanResult.frontImages[0]) {
                                        parameters2.idScanFrontImage = idScanResult.frontImages[0];
                                    }

                                    if (idScanResult.backImages && idScanResult.backImages[0]) {
                                        parameters2.idScanBackImage = idScanResult.backImages[0];
                                    }

                                    const config = {
                                        onUploadProgress: (event) => {
                                            const progress = event.loaded / event.total;
                                            faceScanResultCallback.uploadProgress(progress);
                                        }
                                    }

                                    const response4 = await api.post("/v1/tigo/dar/trusted/ekyc/document-scans", parameters, config);
                                    if (response4 &&
                                        response4.status === 200 &&
                                        response4.data &&
                                        response4.data.body &&
                                        response4.data.body.scanResultBlob) {
                                        intermediaryCb({ type: "idScanCheck", response: response4 });
                                        idScanResultCallback.proceedToNextStep(response4.data.body.scanResultBlob);
                                    } else {
                                        Promise.reject({ type: "idScanCheck", err: response4 });
                                    }
                                }

                                const onFaceTecSDKCompletelyDone = () => {
                                    Promise.resolve(sdkResult);
                                    FaceTecSDK.unload(() => {
                                        intermediaryCb({ type: "Facetec Unload Done" });
                                    })
                                }

                                new FaceTecSDK.FaceTecSession({ onFaceTecSDKCompletelyDone, processSessionResultWhileFaceTecSDKWaits, processIDScanResultWhileFaceTecSDKWaits }, response2.data.body.sessionToken);
                            } else {
                                Promise.reject({ type: "getSessionToken", response: response2 });
                            }
                        } else {
                            Promise.reject({ type: "initiateFacetec" });
                        }
                    });
            } else {
                loader(false);
                Promise.reject({ type: "getKeys", err: response });
            }
        } else {
            loader(false);
            let sdkResult;
            const processSessionResultWhileFaceTecSDKWaits = async (sessionResult, faceScanResultCallback) => {
                sdkResult = sessionResult;
                if (sessionResult.status !== FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
                    faceScanResultCallback.cancel();
                    return;
                }
                const parameters = {
                    faceScan: sessionResult.faceScan,
                    auditTrailImage: sessionResult.auditTrail[0],
                    lowQualityAuditTrailImage: sessionResult.lowQualityAuditTrail[0]
                };
                const config = {
                    onUploadProgress: (event) => {
                        const progress = event.loaded / event.total;
                        faceScanResultCallback.uploadProgress(progress);
                    }
                }
                const response3 = await api.post("/v1/tigo/dar/trusted/ekyc/live-facemaps", parameters, config);
                if (response3 &&
                    response3.status === 200 &&
                    response3.data &&
                    response3.data.body &&
                    response3.data.body.scanResultBlob) {
                    intermediaryCb({ type: "livelinessCheck", response: response3 });
                    faceScanResultCallback.proceedToNextStep(data.body.scanResultBlob);
                } else {
                    Promise.reject({ type: "livelinessCheck", err: response3 });
                }
            }

            const processIDScanResultWhileFaceTecSDKWaits = async (idScanResult, idScanResultCallback) => {
                sdkResult = idScanResult;
                if (idScanResult.status !== FaceTecSDK.FaceTecIDScanStatus.Success) {
                    idScanResultCallback.cancel();
                    return;
                }
                const parameters2 = {
                    idScan: idScanResult.idScan
                };

                if (idScanResult.frontImages && idScanResult.frontImages[0]) {
                    parameters2.idScanFrontImage = idScanResult.frontImages[0];
                }

                if (idScanResult.backImages && idScanResult.backImages[0]) {
                    parameters2.idScanBackImage = idScanResult.backImages[0];
                }

                const config = {
                    onUploadProgress: (event) => {
                        const progress = event.loaded / event.total;
                        faceScanResultCallback.uploadProgress(progress);
                    }
                }

                const response4 = await api.post("/v1/tigo/dar/trusted/ekyc/document-scans", parameters, config);
                if (response4 &&
                    response4.status === 200 &&
                    response4.data &&
                    response4.data.body &&
                    response4.data.body.scanResultBlob) {
                    intermediaryCb({ type: "idScanCheck", response: response4 });
                    idScanResultCallback.proceedToNextStep(response4.data.body.scanResultBlob);
                } else {
                    romise.reject({ type: "idScanCheck", err: response4 });
                }
            }

            const onFaceTecSDKCompletelyDone = () => {
                Promise.resolve(sdkResult);
                FaceTecSDK.unload(() => {
                    intermediaryCb({ type: "Facetec Unload Done" });
                })
            }

            new FaceTecSDK.FaceTecSession({ onFaceTecSDKCompletelyDone, processSessionResultWhileFaceTecSDKWaits, processIDScanResultWhileFaceTecSDKWaits }, sessionToken);
        }
    } catch (err) {
        Promise.reject({ type: "catch", err });
    }
}

export default facetec;