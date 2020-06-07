import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

class SimpleMultiPeer {

    constructor(options) {

        this.signaller = io(options.server, options.connectionOptions || {});

        this._peerOptions = options.peerOptions || {};
        this._room = options.room;

        this.callbacks = options.callbacks || {};

        this.signaller.on("connect", () => { this.onSignallerConnect(); });
        this.signaller.on("signal", (data) => { this.onSignallerSignal(data); });
        this.signaller.on("peers", (peers) => { this.onSignallerPeers(peers); });
        this.signaller.on("disconnect", () => { this.onSignallerDisconnect(); });

        this.peers = {};
    }

    /**
     * Public API
     */

    registerPeerEvents = (peer, id) => {

        peer.on("connect", () => { this.onPeerConnect(id); });
        peer.on("signal", (signal) => { this.onPeerSignal(id, signal); });
        peer.on("data", (data) => { this.onPeerData(id, data); });
        peer.on("stream", (stream) => { this.onPeerStream(id, stream); });
        peer.on("close", () => { this.onPeerClose(id); });
        peer.on("error", (error) => { this.onPeerError(id, error); })
    }

    send = (data) => {
        console.log("Init send process");
        Object.keys(this.peers).forEach((id) => {
            this.peers[id].send(data);
            console.log(`Peer ${id} send ${data}`);
        }, this);
    }

    apply = (func, args) => {
        Object.keys(this.peers).forEach((id) => {
            this.peers[id][func].apply(this.peers[id], args);
        }, this);
    }

    getPeer = (id) => { return this.peers[id]; }

    /**
     * Signaller Events
     */

    onSignallerConnect = () => {
        this.signaller.emit('join', this._room);
    }

    onSignallerSignal = (data) => {
        const options = Object.assign({}, this._peerOptions);
        this.peers[data.id] = new SimplePeer(options);
        this.registerPeerEvents(this.peers[data.id], data.id);
        this.peers[data.id].signal(data.signal);
    }

    onSignallerPeers = (peers) => {
        peers.forEach((id) => {
            const options = Object.assign({ initiator: true }, this._peerOptions);
            this.peers[id] = new SimplePeer(options);
            this.registerPeerEvents(this.peers[id], id);
        }, this);
    }

    onSignallerDisconnect = () => { }

    /**
     * Peer Events
     */

    onPeerConnect = (id) => {
        console.log('connected to ' + id);
        this.callbacks.connect && this.callbacks.connect(id);
    }

    onPeerSignal = (id, signal) => {
        console.log('signal ' + signal + ' from ' + id);
        this.signaller.emit("signal", { "id": id, "signal": signal });
    }

    onPeerData = (id, data) => {
        console.log('received data ' + data + ' from ' + id);
        this.callbacks.data && this.callbacks.data(id, data);
    }

    onPeerStream = (id, stream) => {
        console.log('received stream ' + stream + ' from ' + id);
        this.callbacks.stream && this.callbacks.stream(id, stream);
    }

    onPeerClose = (id) => {
        delete this.peers[id];
        console.log('closed to ' + id);
        this.callbacks.close && this.callbacks.close(id);
    }

    onPeerError = (id, error) => {
        console.error('error with peer ' + id);
        console.error(error);
    }
}

export default SimpleMultiPeer;
