'use strict';

let setHTTPAuthHeader = function( requestOptions, config, updateDatabase ) {
        const md5 = ( string )=> require('crypto').createHash('md5').update( string ).digest('hex');
        const HA1 = md5( config.username + ':APIv4:' + config.secret );
        const HA2 = md5( updateDatabase === true?
                        'GET:/apiv4/device/fetcharchive.json' :
                        'POST:/apiv4/device/detect.json'
                    );
        const cnonce = md5( Math.random().toString() );
        const response = md5( HA1 + ':APIv4:00000001:'+cnonce+':auth:' + HA2 );

        requestOptions.headers.authorization = 'Digest username="' + config.username +
            '", realm="APIv4", nonce="APIv4", uri="' +
            ( updateDatabase === true? '/apiv4/device/fetcharchive.json' : '/apiv4/device/detect.json' ) +
            '", cnonce="' + cnonce + '", nc=00000001, qop=auth, response="' + response + '", opaque="APIv4"';

        if ( updateDatabase === true ) {
            requestOptions.method = 'GET';
            requestOptions.path = '/apiv4/device/fetcharchive.json';
        } else {
            requestOptions.method = 'POST';
            requestOptions.path = '/apiv4/device/detect.json';
        }
    };

module.exports = function( config ) {
    if (config === undefined || typeof config !== 'object' ) {
        throw new Error('A config must be provided.');
    }

    if ( config.username !== undefined && config.secret !== undefined || config.free === true ) {
        let requestOptions = {
            headers: {
                'content-type':'application/json'
            },
            hostname: 'api.handsetdetection.com'
        };

        if ( config.hosted === true ) {
            if ( ( config.premium === true || config.free === true ) && require('cluster').isMaster === true ) {
                setHTTPAuthHeader( requestOptions, config, true );
                config.requestOptions = requestOptions;
                require('child_process').fork( __dirname + '/lib/manageDB.js', [ JSON.stringify( config ) ] );
            }
            return require('./lib/hosted.js')( '/database' + ( config.free === undefined? '-premium' : '' ) + '.json' );
        } else if ( config.cloud === true && config.username !== undefined && config.secret !== undefined  ) {
            setHTTPAuthHeader( requestOptions, config );
            return require('./lib/cloud.js')( requestOptions );
        } else {
            throw new Error('Config must provide hosted:true or cloud:true. If using cloud, username and secret must be provided.');
        }
    } else {
        throw new Error('Config must provide username and secret or set the free parameter to true.');
    }
};