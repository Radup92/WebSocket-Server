/*
 * File : websocket.js
 * Author : David Park
 * Date : 2015-09-14
 * Desc : websocket
*/

/*
 * WebSocket Base Frame Protocol - RFC 6455(5.2)
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-------+-+-------------+-------------------------------+
 * |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 * |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 * |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 * | |1|2|3|       |K|             |                               |
 * +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 * |     Extended payload length continued, if payload len == 127  |
 * + - - - - - - - - - - - - - - - +-------------------------------+
 * |                               |Masking-key, if MASK set to 1  |
 * +-------------------------------+-------------------------------+
 * | Masking-key (continued)       |          Payload Data         |
 * +-------------------------------- - - - - - - - - - - - - - - - +
 * :                     Payload Data continued ...                :
 * + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 * |                     Payload Data continued ...                |
 * +---------------------------------------------------------------+
*/

require( "buffer" );
var net = require( "net" );
var fs = require( "fs" );
var crypto = require( "crypto" );
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

//var myType = "Yuna Seo, Hyun A, Jimin and then Heeyeon Ahn";

var e_message = "You don't have permission to access this page.\r\n<!-- nodejs - scorpion -->";
var dhe = "HTTP/1.1 403 Forbidden\r\n";
//dhe += "My-Type: " + myType + "\r\n";
dhe += "Content-Type: text/html; charset=\"utf-8\"\r\n";
dhe += "Content-Length: " + e_message.length + "\r\n";
dhe += "Server: scorpion\r\n";
dhe += "Connection: Close\r\n\r\n";
var res_http_header = dhe + e_message;

var websocket = (function( ){

var websocket = function( port ){
    return new websocket.fn.init( port );
},
    toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    push = Array.prototype.push,
    slice = Array.prototype.slice,
    trim = String.prototype.trim,
    indexOf = Array.prototype.indexOf;

websocket.fn = websocket.prototype = {
    constructor: websocket,
    init: function( port ){
        var server = new net.Server(), ws = this;

        var listen_delegate = function( ){
            return websocket.fn.listen.apply( ws, null );
        };

        var connection_delegate = function( socket ){
            return websocket.fn.connect.apply( ws, [ socket ] );
        };

        server.listen( port, listen_delegate );
        server.on( "connection", connection_delegate );

        this.server = server;
        this.port = port;

        return this;
    },
    server: null,
    clients: [],
    port: ""
};
websocket.fn.init.prototype = websocket.fn;

websocket.fn.extend = function( ){
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        i = 2;
    }

    if ( typeof target !== "object" && !websocket.fn.isFunction(target) ) {
        target = {};
    }

    if ( length === i ) {
        target = this;
        --i;
    }

    for ( ; i < length; i++ ) {
        if ( (options = arguments[ i ]) != null ) {
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                if ( target === copy ) {
                    continue;
                }

                if ( deep && copy && ( websocket.fn.isPlainObject(copy) || (copyIsArray = websocket.fn.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;
                        clone = src && websocket.fn.isArray(src) ? src : [];

                    } else {
                        clone = src && websocket.fn.isPlainObject(src) ? src : {};
                    }

                    target[ name ] = websocket.fn.extend( deep, clone, copy );

                } else if ( copy !== undefined ){
                    target[ name ] = copy;
                }
            }
        }
    }

    return target;
}

websocket.fn.extend({
    isFunction : function( fn ){
        return websocket.fn.type( fn ) === "function";
    },
    isArray : function( ary ){
        return websocket.fn.type( ary ) === "array";
    },
    type : function( obj ){
        return obj === null ?
            String( obj ) :
            ( /\[object\s([A-z]+)\]/.exec( toString.call( obj ).toLowerCase( ) )[1] ) || "object";
    },
    isPlainObject : function( obj ){
        if ( !obj || websocket.fn.type( obj ) !== "object" || obj.nodeType ){
            return false;
        }

        try {
            if ( obj.constructor &&
                !hasOwn.call(obj, "constructor") &&
                !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
                return false;
            }
        } catch ( e ) {
            return false;
        }

        var key;
        for ( key in obj ) {}

        return key === undefined || hasOwn.call( obj, key );
    },
    isEmptyObject : function( obj ){
        for ( var name in obj ){
            return false;
        }
        return true;
    },
    merge: function( a, b ){
        var i = a.length,
            j = 0;
        if ( typeof b.length === "number" ){
            for ( var k = b.length; j < k; ){
                a[ i++ ] = b[ j++ ];
            }
        }
        else {
            while ( b[j] !== undefined ){
                a[ i++ ] = b[ j++ ];
            }
        }
    },
    toBin: function( n ){
        var ret = [];

        while( n ){
            ret.push( n % 2 );
            n = Math.floor( n / 2 );
        }

        return ret.reverse();
    },
    toHex: function( n ){
        var ret = [], bin = [], len = 0,
            tmp = [];

        bin = this.toBin( n );
        len = bin.length;

        if ( len % 4 > 0 )
            for ( var i = 0; i < 4 - ( len % 4 ); i++ )
                tmp.push( 0 );

        this.merge( tmp, bin );
        while ( tmp.length > 0 ){
            var hex = tmp.splice( 0, 4 ), calc = 0;
            for ( var j = 0; j < hex.length; j++ ){
                calc += hex[j] * Math.pow( 2, ( hex.length - 1 ) - j );

            }
            ret.push( calc );
        }

        return ret;
    },
    extend_pack: function( n, bytes_size ){
        bytes_size = bytes_size || 2;

        var ret = [], hex = [], len = 0,
            tmp = [];
        let hex_size = (bytes_size * 2);

        hex = this.toHex( n );
        len = hex.length;

        if ( len % hex_size > 0 )
            for ( var i = 0; i < hex_size - ( len % hex_size ); i++ )
                tmp.push( 0 );

        this.merge(tmp, hex);
        while ( tmp.length > 0 ){
            var ff = tmp.splice( 0, 2 ), calc = 0;
            for ( var i = 0; i < ff.length; i++ ){
                calc += ff[i] * Math.pow( 16, ( ff.length - 1 ) - i );
            }
            ret.push( calc );
        }

        return ret;
    },
    getCurrentTime: function( ) {
        return (new Date)
            .toISOString()
            .replace('T', ' ').replace(/\..+/, '')
    },
    listen: function( ){
        console.log( "NODE.JS WebSocket Server Start !!!" );
        console.log( "listening port is " + this.port );

        setInterval(()=>{
            if (this.clients.length > 0) {
                var len = this.clients.length
                for (let i = 0; i < len; i++) {
                    let client = this.clients[i]
                    try {
                        if (client.isPong) {
                            try {
                                client.write(Buffer.from([0x89, 0x00]));
                                client.isPong = false;
                            }
                            catch (err) {
                                client.end()
                                this.clients.splice(i, 1);
                                console.log( "["+websocket.fn.getCurrentTime()+"] client( " + client.remote_addr + " ) disconnected!!" );
                            }
                        }
                        else {
                            client.end()
                            this.clients.splice(i, 1);
                            console.log( "["+websocket.fn.getCurrentTime()+"] client( " + client.remote_addr + " ) disconnected!!" );
                        }
                    }
                    catch(err) {
                        this.clients.splice(i, 1);
                    }
                }
            }
        }, 3000)
    },
    connect: function( socket ){
        var uuid = null, remote_addr = socket.remoteAddress, header = {}, method = null, path = "", http_version = "";
        var ws = this, client = socket;

        var handshake = function( request ){
            var req = request.split( "\r\n" ),
                rMethod = /(GET|POST)\s(.*?)\s(.*?)$/i,
                rHeader = /^(.*?)(?:|\s):(?:\s|)(.*)$/i;

            for ( var i = 0; i < req.length; i++ ){
                var line = req[i];

                if ( rMethod.test( line ) ){
                    var match = rMethod.exec( line );
                    method = match[1], path = match[2], http_version = match[3];
                }
                else if ( rHeader.test( line ) ){
                    var match = rHeader.exec( line );
                    if ( match[1] != "X-Forwarded-For" ) header[ match[1] ] = match[2];
                    else {
                        if ( /(.*?)(?:\s|),(?:\s|)(.*)$/i.test( match[2] ) ){
                            remote_addr = /(.*?)(?:\s|),(?:\s|)(.*)$/i.exec( match[2] )[2];
                        }
                        else
                            remote_addr = match[2];
                    }
                }
            }
            if ( "SCORPION-REMOTE-ADDR" in header ) {
              remote_addr = header[ "SCORPION-REMOTE-ADDR" ]
            }

            /* websocket handshake */
            if ( method != null ){
                var is_upgrade = ( ( "upgrade" in header ) || ( "Upgrade" in header ) || ( "UPGRADE" in header ) );
                if ( is_upgrade ){
                    var GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
                    var ws_key = header[ "Sec-WebSocket-Key" ], ws_accept = "";
                    var sha1 = crypto.createHash( "sha1" );

                    if ( ws_key == "" || ws_key == null ) socket.end();

                    ws_accept = sha1.update( ws_key + GUID );
                    ws_accept = sha1.digest( "base64" );

                    var ret = "HTTP/1.1 101 Switching Protocols\r\n";
                    //ret += "My-Type: " + myType + "\r\n";
                    ret += "Sec-WebSocket-Accept: " + ws_accept + "\r\n";
                    ret += "Upgrade: websocket\r\n";
                    ret += "Connection: Upgrade\r\n";
                    ret += "Server: scorpion\r\n\r\n";

                    socket.write( ret, "utf-8" );
                    console.log( "["+websocket.fn.getCurrentTime()+"] client( " + remote_addr + " ) connected." );

                    uuid = ws_accept;

                    /* client function add */
                    websocket.fn.extend(client,{
                        send: function( msg ){
                            let msg_buf = Buffer.from(msg);
                            var header= [], ret = [], length = msg_buf.length, extend_len = 0,
                                payload = null;

                            if ( length > 0x7e ){
                                if ( length >= 0x007e && length <= 0xffff  ){
                                    header = [ 0x82, 0x7e ];
                                    extend_len = websocket.fn.extend_pack( length, 2 );

                                    websocket.fn.merge( ret, header );
                                    websocket.fn.merge( ret, extend_len );

                                    payload = new Buffer( ret );
                                    payload = Buffer.concat([payload, msg_buf]);
                                    this.write( payload );
                                }
                                else if ( length >= 0x0000000000010000 && length <= 0xffffffffffffffff ){
                                    header = [ 0x82, 0x7f ];
                                    extend_len = websocket.fn.extend_pack( length, 8 );

                                    websocket.fn.merge( ret, header );
                                    websocket.fn.merge( ret, extend_len );

                                    payload = new Buffer( ret );
                                    payload = Buffer.concat([payload, msg_buf]);
                                    this.write( payload );
                                }
                            }
                            else {
                                header = [ 0x82, length ];

                                websocket.fn.merge( ret, header );

                                payload = new Buffer( ret );
                                payload = Buffer.concat([payload, msg_buf]);
                                this.write( payload );
                            }
                        },
                        remote_addr: remote_addr,
                        isPong: true
                    });

                    /* websocket clinet */
                    ws.clients.push( client );

                    /* emit connect event */
                    emitter.emit("connect", client)

                }
                else {
                    socket.write( res_http_header, "utf-8" );
                    socket.end( );
                }
            }
        }

        var getBuffer = function( buf, x, length ){
            if ( buf.length > x && buf.length >= ( x + length ) ){
                var ary = [];

                for ( var i = 0; i < length; i++ )
                    ary.push( buf[x++] );

                return ary;
            }

            return [];
        }

        var getDataByBuffer = function( buf, mask_bit, payload_len ){
            var read_pos = 2;

            if ( mask_bit == 1 ){
                var extend_buf = [];

                if ( payload_len == 126 ) extend_buf = getBuffer( buf, read_pos, 2 ), tmp = 0;
                else if ( payload_len == 127 ) extend_buf = getBuffer( buf, read_pos, 8 );

                //데이터 길이 1바이트 저장공간 초과 할 때,
                //extended payload length 계산
                if ( extend_buf.length > 0 ){
                    let tmp = 0;

                    for ( var i = 0; i < extend_buf.length; i++ )
                        tmp += extend_buf[i] * Math.pow( 256, ( extend_buf.length - 1 ) - i );
                    payload_len = tmp
                }

                read_pos += extend_buf.length;

                var mask_key = getBuffer( buf, read_pos, 4 );
                var payload = getBuffer( buf, ( read_pos + mask_key.length ), payload_len );

                var payload_data = "", data_binary = [];
                for ( var i=0; i<payload.length; i++ )
                    data_binary.push( payload[ i ] ^ mask_key[i%4] );

                /* utf-8 read */
                for ( var i=0; i < data_binary.length; ){
                    var data = data_binary[i];

                    if ( 0x00 <= data && 0x7f >= data ){
                        payload_data += String.fromCharCode( data );
                        i++;
                    }
                    else if ( 0xc0 <= data && 0xdf >= data ){
                        //buffer length is 2
                        var first = [], end = [], code = 0;
                        var buf = getBuffer( data_binary, i, 2 );
                        first = websocket.fn.toBin( buf[0] & 0x1f );
                        end = websocket.fn.toBin( buf[1] ).slice( 2 );

                        websocket.fn.merge( first, end );

                        for ( var j = 0; j < first.length; j++ )
                            code += first[j] * Math.pow( 2, ( first.length - 1 ) - j );

                        payload_data += String.fromCharCode( code );
                        i += 2;
                    }
                    else if ( 0xe0 <= data && 0xef >= data ){
                        //buffer length is 3
                        var first = [], end = [], code = 0;
                        var buf = getBuffer( data_binary, i, 3 );

                        for ( var j = 0; j < buf.length; j++ ){
                            if ( j == 0 )
                                first = websocket.fn.toBin( buf[0] & 0x0f );
                            else {
                                websocket.fn.merge( end, websocket.fn.toBin( buf[j] ).slice( 2 ) );
                            }
                        }
                        websocket.fn.merge( first, end );

                        for ( var j = 0; j < first.length; j++ )
                            code += first[j] * Math.pow( 2, ( first.length - 1 ) - j );

                        payload_data += String.fromCharCode( code );
                        i += 3;
                    }
                    else if ( 0xf0 <= data && 0xf7 >= data ){
                        //buffer length is 4
                        var first = [], end = [], code = 0;
                        var buf = getBuffer( data_binary, i, 4 );
                        for ( var j = 0; j < buf.length; j++ ){
                            if ( j == 0 )
                                first = websocket.fn.toBin( buf[0] & 0x07 );
                            else
                                websocket.fn.merge( end, websocket.fn.toBin( buf[j] ).slice( 2 ) );
                        }

                        websocket.fn.merge( first, end );

                        for ( var j = 0; j < first.length; j++ )
                            code += first[j] * Math.pow( 2, ( first.length - 1 ) - j );

                        payload_data += String.fromCharCode( code );
                        i += 4;
                    }
                }
            }
            else {
                var payload = getBuffer( buf, read_pos, payload_len ), payload_data = "";

                for ( var i=0; i<payload.length; i++ ){
                    var ch_code = payload[ i ] ^ mask_key[i%4];
                    console.log( ch_code );
                    payload_data += String.fromCharCode( ch_code );
                }
            }

            return payload_data;
        }

        socket.on( "data", function( data ){
            if ( ws.clients.indexOf( client ) == -1 ){
                var data = ( new Buffer( data )).toString( "utf-8" );
                handshake( data );
            }
            else {
                /* client idx */
                var buf = new Buffer( data );

                /* websocket frame */
                var fin = ( 0x80 & buf[0] ) >> 7;
                var opcode = ( 0x0f & buf[0] );
                var mask_bit = ( 0x80 & buf[1] ) >> 7;
                var payload_len = ( 0x7f & buf[1] );

                /*
                 WebSocket response & recive
                 data packing example
                 { "event_name": process }
                */

                switch ( opcode ){
                    case 0x01:
                    case 0x02:
                        var data = getDataByBuffer( buf, mask_bit, payload_len );

                        if ( data[0] == "{" && data[ data.length - 1 ] == "}" )
                          data = JSON.parse( data );
                        else if ( typeof(data) == "object" )
                          data = data

                        // websocket event process
                        if ( typeof( data ) == "object" ){
                            if ( ws.isPlainObject( data ) ){
                                if ( ws.isEmptyObject( data ) === false ){
                                    var event = data.type, message = data.message;
                                    var callback = data.callback || null;
                                    emitter.emit( event, client, message, callback );
                                }
                            }
                        }
                        else {
                            console.log( "echo message recived.\nmessage: " + data );
                            socket.send( data );
                        }
                    break;
                    case 0x08:
                        if ( ws.clients.length > 0 ){
                            let idx = ws.clients.indexOf( client )
                            if ( idx > -1 ){
                                ws.clients.splice(idx, 1)
                                console.log( "client( " + client.remote_addr + " ) disconnected!!" )

                                /* emit disconnect event */
                                emitter.emit("disconnect", client)
                            }
                        }
                        socket.end( );
                    break;
                    case 0x09:
                        console.log("ping");
                        socket.write(Buffer.from([0x8a, 0x7d]))
                    break;
                    case 0x0a:
                        client.isPong = true;
                    break;
                }
            }
        });

        socket.on( "disconnect", function( ){
            if ( ws.clients.length > 0 ){
                let idx = ws.clients.indexOf( client );
                if ( idx > -1 ){
                    ws.clients.splice(idx, 1);
                    console.log( "["+websocket.fn.getCurrentTime()+"] client( " + client.remote_addr + " ) disconnected!!" );
                }
            }
        });
    },
    on: function( event, listener ){
        this.addEvent( event, listener );
    },
    addEvent: function( event, listener ){
        emitter.addListener( event, listener );
    },
    releaseEvent: function( event, listener ){
        var emitter = new EventEmitter();
        emitter.removeListener(event, listener);
    }
});

return websocket;

})();

/* utf-8 encoder, decoder */
/*
UTF-8 definition - RFC 3629(3)

Char. number range  |        UTF-8 octet sequence
   (hexadecimal)    |              (binary)
--------------------+---------------------------------------------
0000 0000-0000 007F | 0xxxxxxx
0000 0080-0000 07FF | 110xxxxx 10xxxxxx
0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
*/
websocket.fn.extend(websocket.utf8={},{
    encode: function( string ){
    },
    decode: function( binary ){
        if ( websocket.fn.isArray( binary ) === false ) return "";
        let i, buf = binary,
            len = buf.length,
            str = "";

        for (i = 0; i < len;){
            let byte = buf[i];
            let mask = 0x3f;
            let code;

            if (0x00 <= byte && byte <= 0x7f) {
                code = byte;
                i++;
            }
            else if (0xc0 <= byte && byte <= 0xdf) {
                let head = (buf[i++] & 0x1f) << 6;
                let tail = (buf[i++] & mask);

                code = head | tail;
            }
            else if (0xe0 <= byte && byte <= 0xef) {
                let head = (buf[i++] & 0x0f) << 12;
                let tail = ((buf[i++] & mask) << 6)|(buf[i++] & mask);

                code = head | tail;
            }
            else if (0xf0 <= byte && byte <= 0xf7) {
                let head = (buf[i++] & 0x07) << 18;
                let tail = ((buf[i++] & mask) << 12)|((buf[i++] & mask) << 6)|(buf[i++] & mask);

                code = head | tail;
            }
            str += String.fromCharCode(code);
        }

        return str;
    }
});

module.exports = websocket;
