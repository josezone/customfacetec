import { AxiosInstance } from 'axios';
declare class Api {
    axios: AxiosInstance;
    constructor();
    post(url: string, data: any, config?: any): Promise<import("axios").AxiosResponse<any, any>>;
    get(url: string): Promise<import("axios").AxiosResponse<any, any>>;
}
declare const _default: Api;
export default _default;
