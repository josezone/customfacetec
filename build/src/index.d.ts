declare class FaceTecProcess {
    private successCb;
    private errorCb;
    private intermediaryCb;
    private sessionToken;
    constructor(loader: any, successCb: (data: any) => void, errorCb: (data: any) => void, intermediaryCb: (data: any) => void);
    private getKeys;
    private initiateFacetec;
    private getSessionToken;
    private livenessCheckProcessor;
    private livelinessCheck;
    private idScanCheck;
    private uploadProcess;
}
export default FaceTecProcess;
