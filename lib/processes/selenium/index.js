
/*
Copyright (c) 2014, Groupon, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

Neither the name of GROUPON nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var BIN_PATH, SELENIUM_TIMEOUT, async, createSeleniumArguments, ensureBinaries, ensureSeleniumListening, findOpenPort, fs, http, initLogs, path, spawnSelenium, spawnServer;

path = require('path');

http = require('http');

fs = require('fs');

async = require('async');

spawnServer = require('../server').spawnServer;

findOpenPort = require('../port').findOpenPort;

initLogs = require('../../logs');

BIN_PATH = path.join(__dirname, '..', '..', '..', 'bin');

SELENIUM_TIMEOUT = 90000;

ensureSeleniumListening = function(driverUrl, callback) {
  var req;
  req = http.get("" + driverUrl + "/status", function(response) {
    return callback(null, {
      driverUrl: driverUrl
    });
  });
  return req.on('error', function(error) {
    var oldStack;
    oldStack = error.stack;
    oldStack = oldStack.substr(oldStack.indexOf('\n') + 1);
    error.message = "Error: Failed to connect to existing selenium server\n       - url: " + driverUrl + "\n       - message: " + error.message;
    error.stack = "" + error.message + "\n" + oldStack;
    return callback(error);
  });
};

createSeleniumArguments = function(chromeDriverPath) {
  var chromeArgs, firefoxProfilePath;
  chromeArgs = ['--disable-application-cache', '--media-cache-size=1', '--disk-cache-size=1', '--disk-cache-dir=/dev/null', '--disable-cache', '--disable-desktop-notifications'].join(' ');
  firefoxProfilePath = path.join(__dirname, './firefox_profile.js');
  return ["-Dwebdriver.chrome.driver=" + chromeDriverPath, "-Dwebdriver.chrome.args=\"" + chromeArgs + "\"", '-firefoxProfileTemplate', firefoxProfilePath, '-ensureCleanSession', '-debug'];
};

ensureBinaries = function(jarPath) {};

spawnSelenium = function(config, callback) {
  var chromeDriverPath, defaultChromePath, defaultJarPath, jarPath, logs, _base, _base1;
  if (config.selenium.serverUrl) {
    return ensureSeleniumListening(config.selenium.serverUrl, callback);
  }
  logs = initLogs(config);
  defaultJarPath = path.join(BIN_PATH, 'selenium.jar');
  jarPath = (_base = config.selenium).jar != null ? _base.jar : _base.jar = defaultJarPath;
  defaultChromePath = path.join(BIN_PATH, 'chromedriver');
  chromeDriverPath = (_base1 = config.selenium).chromedriver != null ? _base1.chromedriver : _base1.chromedriver = defaultChromePath;
  return async.auto({
    port: findOpenPort,
    chromedriver: function(done) {
      if (config.browser !== 'chrome') {
        return done();
      }
      return fs.stat(chromeDriverPath, done);
    },
    binaries: [
      'chromedriver', function(done) {
        return fs.stat(jarPath, done);
      }
    ],
    selenium: [
      'port', 'binaries', function(done, _arg) {
        var args, options, port;
        port = _arg.port;
        args = ['-Xmx256m', '-jar', jarPath, '-port', "" + port].concat(createSeleniumArguments(chromeDriverPath));
        options = {
          port: port,
          timeout: config.selenium.timeout
        };
        return spawnServer(logs, 'selenium', 'java', args, options, done);
      }
    ]
  }, function(error, _arg) {
    var port, selenium;
    selenium = _arg.selenium, port = _arg.port;
    if (selenium) {
      selenium.driverUrl = "" + selenium.baseUrl + "/wd/hub";
    }
    return callback(error, selenium);
  });
};

module.exports = spawnSelenium;