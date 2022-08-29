import axios, { AxiosInstance } from 'axios';

class Api {
    axios!: AxiosInstance;
    constructor() {
        this.axios = axios.create({
            baseURL: "https://activate-dev.tigo.com.py",
            withCredentials: true,
            headers: {
                Accept: 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    post(url: string, data: any, config?: any) {
        if (config) {
            return axios.post(url, data, config);
        } else {
            return axios.post(url, data);
        }
    }

    get(url: string) {
        return axios.get(url);
    }
}

export default new Api();
