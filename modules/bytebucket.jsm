/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is DownThemAll ByteBucket module.
 *
 * The Initial Developer of the Original Code is Nils Maier
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Nils Maier <MaierMan@web.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ['ByteBucket'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://dta/timers.jsm");

const Timers = new TimerManager();

function Observers() {
	this._obs = [];
	this._timer = Timers.createRepeating(5000, this.observe, this); 
}
Observers.prototype = {
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
	_obs: null,
	_timer: null,
	register: function(observer) {
		this._obs.push(observer);
		Components.utils.reportError("obs: " + this._obs.length);
	},
	unregister: function(observer) {
		this._obs = this._obs.filter(function(e) e != observer);
	},
	notify: function() {
		for each (let o in this._obs) {
			o.observe.call(o);
		}		
	},
	kill: function() {
		Timers.killTimer(this._timer);
	},
	observe: function() {
		this._obs.sort(function() Math.round(Math.random() - 0.5));
	}
}

function ByteBucket(byteRate, burstFactor) {
	this._obs = new Observers();
	this.byteRate = byteRate;
	if (arguments.length > 1) {
		this.burstFactor = burstFactor;
	}
	this._available = byteRate;
	this._timer = Timers.createRepeating(100, this.observe, this);
}
ByteBucket.prototype = {
	_timer: null,
	_available: -1,
	_byteRate: 0,
	_burstFactor: 1.5,
	get byteRate() {
		return this._byteRate;
	},
	set byteRate(nv) {
		if (!isFinite(nv)) {
			throw new Error("Invalid byte rate");
		}
		nv = Math.round(nv);
		if (nv == 0) {
			throw new Error("Invalid byte rate");
		}		
		this._available = this._byteRate = nv;
		this._obs.notify();
		return this._byteRate;
	},
	get burstFactor() {
		return this._burstFactor;
	},
	set burstFactor(nv) {
		if (!isFinite(nv) || nv <= 1) {
			throw new Error("Invalid burst factor");
		}
		return this._burstFactor = nv; 
	},
	requestBytes: function(bytes) {
		if (this._available < 0) {
			return bytes;
		}
		let rv = Math.max(0, Math.min(bytes, this._available));
		this._available -= rv;
		return rv;
	},
	_obs: null,
	register: function(observer) {
		return this._obs.register(observer);
	},
	unregister: function(observer) {
		return this._obs.unregister(observer);
	},
	observe: function() {
		if (this._byteRate <= 0) {
			return;
		}
		this._available = Math.round(
			Math.min(
				this._available + (this._byteRate / 10),
				this.byteRate * this._burstFactor
			)
		);
		this._obs.notify();
	},
	kill: function() {
		Timers.killTimer(this._timer);
		this._obs.kill();
	}
};