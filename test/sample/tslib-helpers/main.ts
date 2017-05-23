function* generateNumber() {
    let index = 10;
    while (index > 0) {
        yield index--;
    }
}

const generator: IterableIterator<number> = generateNumber();
generator.next();

async function wait( n: number ) {
    while ( --n ) {
        await delay( 10 );
    }
}

function delay ( interval: number ) {
    return new Promise( resolve => setTimeout( resolve, interval ) );
}
// todo add more changes between our hardcoded helpers and the official tslib
