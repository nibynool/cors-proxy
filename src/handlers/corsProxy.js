'use strict';

const fetch = require('node-fetch');

/**
 * Use this command to launch the handler from console:
 *
 * node_modules/.bin/serverless invoke local -f lambda -d '{"httpMethod":"GET","queryStringParameters":{"url":"http://github.com"}}'
 *
 *  or from browser
 *
 * http://localhost:3000/?url=https://github.com
 */
module.exports.handler = async (event) => {
    return new Promise(async (resolve, reject) => {
        let params = event.queryStringParameters;
        let authorisedHostsRegEx = new RegExp(".*\\." + process.env.AUTHORISED_HOSTS);
        let { Host, host, Origin, origin, ...headers } = event.headers;

        console.log(event);
        console.log(`Got request with params:`, params);

        if (!host.match(authorisedHostsRegEx)) {
            const errorResponse = {
                statusCode: 401,
                body: "Unauthorised origin host (" + host + " was found, expected " + authorisedHostsRegEx.toString() + ")",
            };
            reject(Error(errorResponse));
            return;
        }

        if (!params.url) {
            const errorResponse = {
                statusCode: 400,
                body: "Unable get url from 'url' query parameter",
            };
            reject(Error(errorResponse));
            return;
        }

        const requestParams = Object.entries(params)
            .reduce((acc, param) => {
                if (param[0] !== 'url') acc.push(param.join('='));
                return acc;
            }, [])
            .join('&');

        const url = `${params.url}${requestParams}`;
        const hasBody = /(POST|PUT)/i.test(event.httpMethod);
        try {
            const res = await fetch(url, {
                method: event.httpMethod,
                timeout: 20000,
                body: hasBody ? event.body : null,
                headers,
            });
            console.log(`Got response from ${url} ---> {statusCode: ${res.status}}`);

            let proxyResponse = {
                statusCode: res.status,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
                    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
                    'content-type': res.headers['content-type'],
                },
            };

            proxyResponse.body = await res.text();
            resolve(proxyResponse);
        } catch (err) {
            console.error(`Caught error: `, err);

            reject(err);
            return;
        }
    });
};
