var crypto = require('crypto'),
	bignum = require('bignum'),
	ed = require('ed25519'),
	params = require('../helpers/params.js'),
	shuffle = require('knuth-shuffle').knuthShuffle,
	Router = require('../helpers/router.js'),
	arrayHelper = require('../helpers/array.js'),
	slots = require('../helpers/slots.js'),
	schedule = require('node-schedule'),
	util = require('util'),
	genesisblock = require("../helpers/genesisblock.js");

require('array.prototype.find'); //old node fix

//private fields
var modules, library, self;

var keypair, myDelegate, address, account;
var activeDelegates = [];
var loaded = false;
var unconfirmedDelegates = [];
var unconfirmedNames = [];
var votes = {};
var names = {}

//var keypairs;

//constructor
function Delegates(cb, scope) {
	library = scope;
	self = this;
	//keypairs = [];

	attachApi();

	setImmediate(cb, null, self);
}

//private methods
function attachApi() {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules && loaded) return next();
		res.status(500).send({success: false, error: 'loading'});
	});

	/*router.get('/forging/status', function (req, res) {
		var publicKey = req.query.publicKey;

		if (!publicKey) {
			return res.json({success: false, error: "Provide public key of account"});
		}

		var enabled = false;
		for (var i = 0; i < keypairs.length; i++) {
			if (keypairs[i].publicKey.toString('hex') == req.query.publicKey) {
				enabled = true;
				break;
			}
		}

		return res.json({success: true, enabled: enabled});
	});

	router.post('/forging/enable', function (req, res) {
		var secret = req.query.secret;

		if (!secret) {
			return res.json({success: false, error: "Provide secret key of account"});
		}

		var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);
		var publicKey = keypair.publicKey.toString('hex')

		for (var i = 0; i < keypairs.length; i++) {
			if (keypairs[i].publicKey.toString('hex') == publicKey) {
				return res.json({success: false, error: "Forging on this account already enabled"});
			}
		}

		keypairs.push(keypair);
		return res.json({success: true});
	});

	router.get('/forging/disable', function (req, res) {
		var secret = req.queyr.secret;

		if (!secret) {
			return res.json({success: false, error: "Provide secret key of account"});
		}

		var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);
		var publicKey = keypair.publicKey.toString('hex')

		for (var i = 0; i < keypairs.length; i++) {
			if (keypairs[i].publicKey.toString('hex') == publicKey) {
				keypairs.splice(i, 1);
				return res.json({success: true});
			}
		}

		return res.json({success: false, error: "Forger with this public key not found"});
	});*/

	router.put('/', function (req, res) {
		var secret = params.string(req.body.secret),
			publicKey = params.hex(req.body.publicKey || null, true),
			secondSecret = params.string(req.body.secondSecret, true),
			username = params.string(req.body.username);

		var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (publicKey) {
			if (keypair.publicKey.toString('hex') != publicKey) {
				return res.json({success: false, error: "Please, provide valid secret key of your account"});
			}
		}

		var account = modules.accounts.getAccountByPublicKey(keypair.publicKey.toString('hex'));

		if (!account) {
			return res.json({success: false, error: "Account doesn't has balance"});
		}

		if (!account.publicKey) {
			return res.json({success: false, error: "Open account to make transaction"});
		}

		var transaction = {
			type: 2,
			amount: 0,
			recipientId: null,
			senderPublicKey: account.publicKey,
			timestamp: slots.getTime(),
			asset: {
				delegate: {
					username: username
				}
			}
		};

		modules.transactions.sign(secret, transaction);

		if (account.secondSignature) {
			if (!secondSecret || secondSecret.length == 0) {
				return res.json({success: false, error: "Provide second secret key"});
			}

			modules.transactions.secondSign(secondSecret, transaction);
		}

		modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
			if (err) {
				return res.json({success: false, error: err});
			}

			res.json({success: true, transaction: transaction});
		});
	});

	library.app.use('/api/delegates', router);
	library.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error('/api/delegates', err)
		res.status(500).send({success: false, error: err});
	});
}

function getKeysSortByVote(votes) {
	var delegates = Object.keys(votes);
	delegates = delegates.sort(function compare(a, b) {
		return votes[b] - votes[a];
	});
	return delegates;
}

function getBlockTime(slot, height) {
	activeDelegates = self.generateDelegateList(getKeysSortByVote(votes), height);

	var currentSlot = slot;
	var lastSlot = slots.getLastSlot(currentSlot);

	for (; currentSlot < lastSlot; currentSlot += 1) {
		var delegate_pos = currentSlot % slots.delegates;

		var delegate_id = activeDelegates[delegate_pos];
		if (delegate_id && myDelegate == delegate_id) {
			return slots.getSlotTime(currentSlot);
		}
	}
	return null;
}

function loop(cb) {
	setImmediate(cb);

	if (!myDelegate || !account) {
		library.logger.log('loop', 'exit: no delegate');
		return;
	}

	if (!loaded || modules.loader.syncing()) {
		library.logger.log('loop', 'exit: syncing');
		return;
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.getLastBlock();

	if (currentSlot == slots.getSlotNumber(lastBlock.timestamp)) {
		library.logger.log('loop', 'exit: lastBlock is in the same slot');
		return;
	}

	var currentBlockTime = getBlockTime(currentSlot, lastBlock.height + 1);

	if (currentBlockTime === null) {
		library.logger.log('loop', 'skip slot');
		return;
	}

	library.sequence.add(function (cb) {
		// how to detect keypair
		if (slots.getSlotNumber(currentBlockTime) == slots.getSlotNumber()) {
			modules.blocks.generateBlock(keypair, currentBlockTime, function (err) {
				library.logger.log('round: ' + modules.round.calc(modules.blocks.getLastBlock().height) + ' new block id: ' + modules.blocks.getLastBlock().id + ' height:' + modules.blocks.getLastBlock().height + ' slot:' + slots.getSlotNumber(currentBlockTime))
				cb(err);
			});
		} else {
			library.logger.log('loop', 'exit: another delegate slot');
			setImmediate(cb);
		}
	}, function (err) {
		if (err) {
			library.logger.error("Problem in block generation", err);
		}
	});
}

function loadMyDelegates() {
	var secret = library.config.forging.secret

	if (secret) {
		keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
		address = modules.accounts.getAddressByPublicKey(keypair.publicKey.toString('hex'));
		account = modules.accounts.getAccount(address);
		if (self.existsDelegate(keypair.publicKey.toString('hex'))) {
			myDelegate = keypair.publicKey.toString('hex');
		}

		library.logger.info("Forging enabled on account: " + address);
	}
}

//public methods
Delegates.prototype.generateDelegateList = function (sortedDelegateList, height) {
	var seedSource = modules.round.calc(height).toString();

	var currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();
	for (var i = 0, delCount = sortedDelegateList.length; i < delCount; i++) {
		for (var x = 0; x < 4 && i < delCount; i++, x++) {
			var newIndex = currentSeed[x] % delCount;
			var b = sortedDelegateList[newIndex];
			sortedDelegateList[newIndex] = sortedDelegateList[i];
			sortedDelegateList[i] = b;
		}
		currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
	}

	return sortedDelegateList;
}

Delegates.prototype.checkDelegates = function (publicKey, votes) {
	if (votes === null) {
		return true;
	}

	if (util.isArray(votes)) {
		var account = modules.accounts.getAccountByPublicKey(publicKey);
		if (!account) {
			return false;
		}

		for (var i = 0; i < votes.length; i++) {
			var math = votes[i][0];
			var publicKey = votes[i].slice(1);
			if (math == "+" && (account.delegates !== null && account.delegates.indexOf(publicKey) != -1)) {
				return false;
			}
			if (math == "-" && (account.delegates === null || account.delegates.indexOf(publicKey) === -1)) {
				return false;
			}
		}

		return true;
	} else {
		return false;
	}
}

Delegates.prototype.addUnconfirmedDelegate = function (delegate) {
	unconfirmedDelegates[delegate.publicKey] = true;
	unconfirmedNames[delegate.publicKey] = true;
}

Delegates.prototype.getUnconfirmedDelegate = function (delegate) {
	return !!unconfirmedDelegates[delegate.publicKey];
}

Delegates.prototype.getUnconfirmedName = function (delegate) {
	return !!unconfirmedNames[delegate.username];
}

Delegates.prototype.removeUnconfirmedDelegate = function (delegate) {
	delete unconfirmedDelegates[delegate.publicKey];
	delete unconfirmedNames[delegate.publicKey];
}

Delegates.prototype.existsDelegate = function (publicKey) {
	return votes[publicKey] !== undefined;
}

Delegates.prototype.existsName = function (userName) {
	return names[userName] !== undefined;
}

Delegates.prototype.cache = function (delegate) {
	votes[delegate.publicKey] = 0;
	names[delegate.username] = delegate.publicKey;
}

Delegates.prototype.uncache = function (delegate) {
	delete votes[delegate.publicKey];
	delete names[delegate.username];
}

Delegates.prototype.validateBlockSlot = function (block) {
	var activeDelegates = self.generateDelegateList(getKeysSortByVote(votes), block.height);

	var currentSlot = slots.getSlotNumber(block.timestamp);
	var delegate_id = activeDelegates[currentSlot % slots.delegates];

	if (delegate_id && block.generatorPublicKey == delegate_id) {
		return true;
	}

	return false;
}

//events
Delegates.prototype.onBind = function (scope) {
	modules = scope;
}

Delegates.prototype.onBlockchainReady = function () {
	loaded = true;

	loadMyDelegates(); //temp

	process.nextTick(function nextLoop() {
		loop(function (err) {
			err && library.logger.error('delegate loop', err);

			var nextSlot = slots.getNextSlot();

			var scheduledTime = slots.getSlotTime(nextSlot);
			scheduledTime = scheduledTime <= slots.getTime() ? scheduledTime + 1 : scheduledTime;
			schedule.scheduleJob(new Date(slots.getRealTime(scheduledTime) + 1000), nextLoop);
		})
	});
}

Delegates.prototype.onNewBlock = function (block, broadcast) {
	modules.round.runOnFinish(function () {
		if (keypair && self.existsDelegate(keypair.publicKey.toString('hex'))) {
			myDelegate = keypair.publicKey.toString('hex');
		}
	});

	modules.round.tick(block);
}

Delegates.prototype.onChangeBalance = function (delegates, amount) {
	modules.round.runOnFinish(function () {
		var vote = amount / 100000000;

		if (delegates !== null) {
			delegates.forEach(function (publicKey) {
				votes[publicKey] += vote;
			});
		}
	});
}

Delegates.prototype.onChangeDelegates = function (balance, diff) {
	modules.round.runOnFinish(function () {
		var vote = balance / 100000000;

		for (var i = 0; i < diff.length; i++) {
			var math = diff[i][0];
			var publicKey = diff[i].slice(1);
			if (math == "+") {
				votes[publicKey] += vote;
			}
			if (math == "-") {
				votes[publicKey] -= vote;
			}
		}
	});
}

//export
module.exports = Delegates;