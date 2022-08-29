"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const joset_1 = require("joset");
const api_1 = require("./utils/api");
class FaceTecProcess {
    constructor(loader, successCb, errorCb, intermediaryCb) {
        this.uploadProcess = (uploadProgress) => (event) => {
            const progress = event.loaded / event.total;
            uploadProgress(progress);
        };
        {
            this.successCb = successCb;
            this.errorCb = errorCb;
            this.intermediaryCb = intermediaryCb;
            joset_1.FaceTecSDK.setResourceDirectory("/FaceTec_resources");
            joset_1.FaceTecSDK.setImagesDirectory("/FaceTec_images");
            Promise.all([
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.data'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8.wasm'),
                fetch('/FaceTec_resources/011c90516755d702cfb4205ca9d93e21fe6683b8_cache.wasm')
            ]).then((res) => Promise.all(res.map(val => val.blob()))).then(() => {
                this.getKeys(loader);
            }).catch(() => {
                this.getKeys(loader);
            });
        }
    }
    getKeys(loader) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.sessionToken) {
                    this.livenessCheckProcessor(this.sessionToken);
                }
                else {
                    const response = yield api_1.default.get("/v1/tigo/dar/trusted/ekyc/keys");
                    const data = response.data;
                    const status = response.status;
                    if (status === 200 && ((_a = data === null || data === void 0 ? void 0 : data.body) === null || _a === void 0 ? void 0 : _a.deviceKeyIdentifier) && ((_b = data === null || data === void 0 ? void 0 : data.body) === null || _b === void 0 ? void 0 : _b.publicFaceMapEncryptionKey) && ((_c = data === null || data === void 0 ? void 0 : data.body) === null || _c === void 0 ? void 0 : _c.sdkEncryptionKeyBrowser)) {
                        this.intermediaryCb({ type: "getKeys", data });
                        loader(false);
                        this.initiateFacetec((_d = data === null || data === void 0 ? void 0 : data.body) === null || _d === void 0 ? void 0 : _d.deviceKeyIdentifier, (_e = data === null || data === void 0 ? void 0 : data.body) === null || _e === void 0 ? void 0 : _e.publicFaceMapEncryptionKey, (_f = data === null || data === void 0 ? void 0 : data.body) === null || _f === void 0 ? void 0 : _f.sdkEncryptionKeyBrowser);
                    }
                    else {
                        this.errorCb({ type: "getKeys", err: data });
                        loader(false);
                    }
                }
            }
            catch (err) {
                this.errorCb({ type: "getKeys", err });
                loader(false);
            }
        });
    }
    initiateFacetec(deviceKeyIdentifier, publicFaceMapEncryptionKey, sdkEncryptionKeyBrowser) {
        return __awaiter(this, void 0, void 0, function* () {
            const getSessionToken = this.getSessionToken;
            const intermediaryCb = this.intermediaryCb;
            const errorCb = this.errorCb;
            joset_1.FaceTecSDK.initializeInProductionMode(sdkEncryptionKeyBrowser, deviceKeyIdentifier, publicFaceMapEncryptionKey, function (initializedSuccessfully) {
                if (initializedSuccessfully) {
                    intermediaryCb({ type: "initiateFacetec" });
                    getSessionToken();
                }
                else {
                    errorCb({ type: "initiateFacetec" });
                }
            });
        });
    }
    getSessionToken() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield api_1.default.get("/v1/tigo/dar/trusted/ekyc/session-tokens");
                const data = response.data;
                const status = response.status;
                if (status === 200 && ((_a = data === null || data === void 0 ? void 0 : data.body) === null || _a === void 0 ? void 0 : _a.sessionToken)) {
                    this.intermediaryCb({ type: "getSessionToken", data });
                    this.sessionToken = (_b = data === null || data === void 0 ? void 0 : data.body) === null || _b === void 0 ? void 0 : _b.sessionToken;
                    this.livenessCheckProcessor((_c = data === null || data === void 0 ? void 0 : data.body) === null || _c === void 0 ? void 0 : _c.sessionToken);
                }
                else {
                    this.errorCb({ type: "getSessionToken", err: data });
                }
            }
            catch (err) {
                this.errorCb({ type: "getSessionToken", err });
            }
        });
    }
    livenessCheckProcessor(sessionToken) {
        const errorCb = this.errorCb;
        const livelinessCheck = this.livelinessCheck;
        const idScanCheck = this.idScanCheck;
        const successCb = this.successCb;
        const intermediaryCb = this.intermediaryCb;
        let sdkResult;
        try {
            function processSessionResultWhileFaceTecSDKWaits(sessionResult, faceScanResultCallback) {
                sdkResult = sessionResult;
                if (sessionResult.status !== joset_1.FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
                    errorCb({ type: "sessionError", err: joset_1.FaceTecSDK.FaceTecSessionStatus[sessionResult.status] });
                    faceScanResultCallback.cancel();
                    return;
                }
                livelinessCheck(sessionResult, faceScanResultCallback);
            }
            function processIDScanResultWhileFaceTecSDKWaits(idScanResult, idScanResultCallback) {
                sdkResult = idScanResult;
                if (idScanResult.status !== joset_1.FaceTecSDK.FaceTecIDScanStatus.Success) {
                    errorCb({ type: "idSessionError", err: joset_1.FaceTecSDK.FaceTecIDScanStatus[idScanResult.status] });
                    idScanResultCallback.cancel();
                    return;
                }
                idScanCheck(idScanResult, idScanResultCallback);
            }
            function onFaceTecSDKCompletelyDone() {
                successCb(sdkResult);
                joset_1.FaceTecSDK.unload(() => {
                    intermediaryCb({ type: "Facetec Unload Done" });
                });
            }
            new joset_1.FaceTecSDK.FaceTecSession({ onFaceTecSDKCompletelyDone, processSessionResultWhileFaceTecSDKWaits, processIDScanResultWhileFaceTecSDKWaits }, sessionToken);
        }
        catch (err) {
            this.errorCb({ type: "getSessionToken", err });
        }
    }
    livelinessCheck(sessionResult, faceScanResultCallback) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parameters = {
                    faceScan: sessionResult.faceScan,
                    auditTrailImage: sessionResult.auditTrail[0],
                    lowQualityAuditTrailImage: sessionResult.lowQualityAuditTrail[0]
                };
                const config = {
                    onUploadProgress: this.uploadProcess(faceScanResultCallback.uploadProgress)
                };
                const response = yield api_1.default.post("/v1/tigo/dar/trusted/ekyc/live-facemaps", parameters, config);
                const data = response.data;
                const status = response.status;
                if (status === 200 && ((_a = data === null || data === void 0 ? void 0 : data.body) === null || _a === void 0 ? void 0 : _a.scanResultBlob)) {
                    this.intermediaryCb({ type: "livelinessCheck", data });
                    faceScanResultCallback.proceedToNextStep(data.body.scanResultBlob);
                }
                else {
                    this.errorCb({ type: "livelinessCheck", err: data });
                }
            }
            catch (err) {
                this.errorCb({ type: "livelinessCheck", err });
            }
        });
    }
    idScanCheck(idScanResult, idScanResultCallback) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parameters = {
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
                };
                const response = yield api_1.default.post("/v1/tigo/dar/trusted/ekyc/document-scans", parameters, config);
                const data = response.data;
                const status = response.status;
                if (status === 200 && ((_a = data === null || data === void 0 ? void 0 : data.body) === null || _a === void 0 ? void 0 : _a.scanResultBlob)) {
                    this.intermediaryCb({ type: "idScanCheck", data });
                    idScanResultCallback.proceedToNextStep((_b = data === null || data === void 0 ? void 0 : data.body) === null || _b === void 0 ? void 0 : _b.scanResultBlob);
                }
                else {
                    this.errorCb({ type: "idScanCheck", err: data });
                }
            }
            catch (err) {
                this.errorCb({ type: "idScanCheck", err });
            }
        });
    }
}
exports.default = FaceTecProcess;
//# sourceMappingURL=index.js.map