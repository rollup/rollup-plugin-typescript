function* generateNumber() {
    let index = 10;
    while (index > 0) {
        yield index--;
    }
}

const generator: IterableIterator<number> = generateNumber();
generator.next();

// todo add more changes between our hardcoded helpers and the official tslib
