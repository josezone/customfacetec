"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
class Api {
    constructor() {
        this.axios = axios_1.default.create({
            baseURL: "https://activate-dev.tigo.com.py",
            withCredentials: true,
            headers: {
                Accept: 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
    post(url, data, config) {
        if (config) {
            return axios_1.default.post(url, data, config);
        }
        else {
            return axios_1.default.post(url, data);
        }
    }
    get(url) {
        return axios_1.default.get(url);
    }
}
exports.default = new Api();
//# sourceMappingURL=api.js.map