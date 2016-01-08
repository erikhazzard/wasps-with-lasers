var os = require('os');
var interfaces = os.networkInterfaces();

module.exports = function getLocalIPAddresses () {
    var addresses = [];
    for (var curInterface in interfaces) {
        for (var targetKey in interfaces[curInterface]) {
            var address = interfaces[curInterface][targetKey];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }

    return addresses;
}
