var http = require('http'),
    keepAliveAgent = require('keep-alive-agent');

var peer = function (address, port, platform, version) {
    this.ip = address;
    this.port = port;
    this.version = version;
    this.state = 0;
    this.shareAddress = true;
    this.platform = "";
    this.version =  1;
    this.downloadedVolume = 0;
    this.uploadedVolume = 0;
    this.blacklistedTime = 0;
    this.agent = null;
    this.app = null;
}

peer.prototype.setApp = function (app) {
    this.app = app;
    this._version = app.info.version;
    this._platform = app.info.platform;
}

peer.prototype.setState = function (state) {
    this.state = state;
}

peer.prototype.getUploadedVolume = function () {
    return this.uploadedVolume;
}

peer.prototype.getDownloadedVolume = function () {
    this.downloadedVolume;
}

peer.prototype.updateDownloadedVolume = function (downloaded) {
    this.downloadedVolume += downloaded;
}

peer.prototype.updateUploadedVolume = function (uploaded) {
    this.uploadedVolume += uploaded;
}

peer.prototype.isBlacklisted = function () {
    return (this.blacklistedTime > 0 && this.state == 3);
}

peer.prototype.setBlacklisted = function (blacklisted) {
    if (blacklisted) {
        this.blacklistedTime = new Date().getTime();
        this.state = 3;
    } else {
        this.blacklistedTime = 0;
        this.state = 0;
    }
}

peer.prototype.checkBlacklisted = function () {
    if (this.blacklistedTime > 0) {

        if (this.blacklistedTime + 1000 * 60 * 10 < new Date().getTime()) {
            this.blacklistedTime = 0;
            this.state = 0;
            return false;
        }

        return true;
    } else {
        this.state = 3;
        return false;
    }
}

peer.prototype.setShare = function (share) {
    this.shareAddress = share;
}

peer.prototype.checkAgent = function () {
    if (!this.agent) {
        this.agent = new keepAliveAgent;
    }
}

peer.prototype.getPeers = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getPeers',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };
    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getPeer = function (ip, cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getPeer?ip=' + ip,
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getInfo = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getInfo',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getInfo = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getInfo',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getCumulativeDifficulty = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getCumulativeDifficulty',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}


peer.prototype.getNextBlockIds = function (blockId, cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getNextBlockIds?blockId=' + blockId,
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getNextBlocks = function (blockId, cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getNextBlocks?blockId=' + blockId,
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.processTransactions = function (transactions, cb) {

    var newTransactions = [];
    for (var i = 0; i < transactions.length; i++) {
        newTransactions.push(transactions[i].toJSON());
    }

    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/processTransactions?transactions=' + JSON.parse(newTransactions),
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getUnconfirmedAddresses = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getUnconfirmedAddresses',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.getUnconfirmedTransactions = function (cb) {
    this.checkAgent();

    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/getUnconfirmedTransactions',
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

peer.prototype.processBlock = function (block, cb) {
    var getOptions = {
        hostname: this.ip,
        port: this.port,
        path: '/peer/processBlock?block=' + JSON.parse(block.toJSON()),
        agent: this.agent,
        headers: {
            "platform" : this._platform,
            "version" : this._version
        }
    };

    var r = http.get(getOptions, function (res) {
        var data = "";
        res.on("data", function(body) {
            data += body;
        });
        res.on('end', function () {
            cb(null, data);
        });
    });
    r.on('error', function (err) {
        cb(err, null);
    });
}

module.exports = peer;