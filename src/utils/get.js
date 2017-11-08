'use strict';

const URL = require('url');

const parse = require('../response/parse.js');
const error = require('../response/error.js');
const RTMClient = require('../client.js');
const RTMUser = require('../user.js');
const sign = require('./sign.js');

// API Configuration Properties
const config = require('../../rtm.json');
const scheme = config.api.scheme;
const base = config.api.url.base;
const format = config.api.format;
const version = config.api.version;


/**
 * Make the specified RTM API call.
 * @param {string} method RTM API Method
 * @param {object} [params={}] RTM Method Parameters (as an object with key/value pairs)
 * @param {RTMUser} [user=undefined] The RTM User making the request
 * @param {RTMClient} [client=undefined] The RTM Client making the request
 * @param {function} callback Callback function(resp)
 * @private
 */
function get(method, params, user, client, callback) {

  // Parse the given arguments
  let args = _parseGetArgs(method, params, user, client, callback);

  // Build the Request URL
  let requestUrl = _buildRequestUrl(args.method, args.params, args.user, args.client);

  // Parse the URL
  let url = URL.parse(requestUrl);

  // Require the http(s) module
  let http = undefined;
  if ( scheme === "https" ) {
    http = require('https');
  }
  else {
    http = require('http');
  }

  // Build the request options
  let options = {
    host: url.host,
    path: url.path,
    method: 'GET'
  };

  // Make the Request
  let req = http.request(options, function(response) {
    let resp = '';
    response.on('data', function(chunk) {
      resp += chunk;
    });
    response.on('end', function() {
      let parsed = parse(resp);
      // TODO: Save transaction id and information if undoable
      args.callback(parsed);
    });
  });
  req.on('error', function() {
    args.callback(error.networkError());
  });
  req.end();

}


/**
 * Parse the arguments given to the get() function
 * @returns {{method: *, params: *, user: *, client: *, callback: *}}
 * @private
 */
function _parseGetArgs() {

  // Parsed arguments to return
  let rtn = {};
  rtn.params = {};

  // Parse each of the arguments
  for ( let key in arguments ) {
    if ( arguments.hasOwnProperty(key) ) {
      let arg = arguments[key];
      if ( typeof arg === 'string' ) {
        rtn.method = arg;
      }
      else if ( typeof arg === 'function' ) {
        rtn.callback = arg;
      }
      else if ( typeof arg === 'object' ) {
        if ( arg.constructor.name === 'RTMClient' ) {
          rtn.client = arg;
        }
        else if ( arg.constructor.name === 'RTMUser' ) {
          rtn.user = arg;
        }
        else {
          rtn.params = arg;
        }
      }
    }
  }

  // Return the parsed arguments
  return rtn;

}



/**
 * Build the API Request URL.
 *
 * This uses the properties in the `rtm.json` configuration file for the
 * URL scheme, base URL, format and version.  It will create a URL encoded
 * query string from the passed parameters and add a signature to the request.
 * @param {string} method RTM API Method
 * @param {Object} [params={}] Request Parameters
 * @param {RTMUser} [user=undefined] The RTM User making the request
 * @param {RTMClient} [client=undefined] The RTM Client making the request
 * @returns {string} Signed Request URL
 * @private
 */
function _buildRequestUrl(method, params, user, client) {

  // Parse the given arguments
  let args = _parseBuildRequestUrlArgs(method, params, user, client);

  // Add User Auth Token, if provided
  if ( args.user && args.user.authToken ) {
    args.params.auth_token = args.user.authToken;
  }

  // Add method, api key, version and format to params
  args.params.method = args.method;
  args.params.api_key = args.client.key;
  args.params.version = version;
  args.params.format = format;
  args.params.api_sig = sign(args.params, client);

  // Generate query string from params
  let query = _formQuery(args.params);

  // Build the API request URL
  return scheme + '://' + base + "?" + query;

}


/**
 * Parse the arguments given to the _buildRequestUrl function
 * @returns {{method: *, params: *, user: *, client: *}}
 * @private
 */
function _parseBuildRequestUrlArgs() {

  // Parsed arguments to return
  let rtn = {};
  rtn.params = {};

  // Parse each of the arguments
  for ( let key in arguments ) {
    if ( arguments.hasOwnProperty(key) ) {
      let arg = arguments[key];
      if ( typeof arg === 'string' ) {
        rtn.method = arg;
      }
      else if ( typeof arg === 'object' ) {
        if ( arg.constructor.name === 'RTMClient' ) {
          rtn.client = arg;
        }
        else if ( arg.constructor.name === 'RTMUser' ) {
          rtn.user = arg;
        }
        else {
          rtn.params = arg;
        }
      }
    }
  }

  // Return the parsed arguments
  return rtn;

}


/**
 * Generate a URI Encoded query string from the parameters set of
 * key/value pairs
 * @param {object} params Object containing the key/value parameters
 * @returns {string} URL Encoded query string
 * @private
 */
function _formQuery(params) {
  let parts = [];
  for ( let key in params ) {
    if ( params.hasOwnProperty(key) ) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    }
  }
  return parts.join("&");
}



module.exports = get;