const natives = {
    random: (...args) => {
        if (args.length === 0) {
            return Math.random();
        }
        
        if (args.length === 1) {
            const max = Math.floor(args[0]);
            return Math.floor(Math.random() * max) + 1;
        }
        
        if (args.length >= 2) {
            const min = Math.ceil(args[0]);
            const max = Math.floor(args[1]);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },
    sqrt: (x) => Math.sqrt(x),
    pow: (b, e) => Math.pow(b, e),
    sin: (x) => Math.sin(x),
    cos: (x) => Math.cos(x),
    tan: (x) => Math.tan(x),
    atan2: (y, x) => Math.atan2(y, x),
    asin: (x) => Math.asin(x),
    acos: (x) => Math.acos(x),
    atan: (x) => Math.atan(x),
    log: (x) => Math.log(x),
    log10: (x) => Math.log10(x),
    exp: (x) => Math.exp(x)
};

module.exports = { natives };