const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pug = require('pug');

// Read source file
const sourceString = fs.readFileSync(path.resolve('./output.json'));
const source = JSON.parse(sourceString);

const template = {
    listPage: pug.compileFile(path.resolve('./template/list-page.pug')),
};

//
function encodeUrl(indexes = [], title = '') {
    indexes = indexes.map((i) => `${i}`.padStart(3, '0'));

    let url = crypto
        .createHash('MD5')
        .update(`${title}${indexes.join('.')}`)
        .digest('hex');

    return `${url}.html`;
}

//
function itemShiftRight(cIndex, gIndex, pIndex) {
    pIndex += 1;

    let pLength = source[cIndex].children[gIndex].children.length;
    if (pIndex >= pLength) {
        gIndex += 1;

        let gLength = source[cIndex].children.length;
        if (gIndex >= gLength) {
            cIndex += 1;

            let cLength = source.length;
            if (cIndex >= cLength) return undefined;
            else {
                gIndex = 0;
                pIndex = 0;
            }
        } else {
            pIndex = 0;
        }
    }

    return source[cIndex].children[gIndex].children[pIndex];
}

//
function itemShiftLeft(cIndex, gIndex, pIndex) {
    pIndex -= 1;

    if (pIndex < 0) {
        gIndex -= 1;

        if (gIndex < 0) {
            cIndex -= 1;

            if (cIndex < 0) return undefined;
            else {
                gIndex = source[cIndex].children.length - 1;
                pIndex = source[cIndex].children[gIndex].children.length - 1;
            }
        } else {
            pIndex = source[cIndex].children[gIndex].children.length - 1;
        }
    }

    return source[cIndex].children[gIndex].children[pIndex];
}

//
function itemShift(cIndex, gIndex, pIndex, isIncrease) {
    return isIncrease ? itemShiftRight(cIndex, gIndex, pIndex) : itemShiftLeft(cIndex, gIndex, pIndex);
}

// Refactor Url
source.forEach((category, cIndex) => {
    category.url = encodeUrl([cIndex], category.title);
    category.children.forEach((group, gIndex) => {
        group.url = encodeUrl([cIndex, gIndex], group.title);
        group.children.forEach((page, pIndex) => {
            page.url = encodeUrl([cIndex, gIndex, pIndex], page.title);
        });
    });
});

// Create Index Page
fs.writeFileSync(
    path.resolve('./website/index.html'),
    template.listPage({
        title: 'Home | MaxReading Offline Clone',
        heading: 'MaxReading Offline Clone',
        breadcrumb: undefined,
        current: undefined,
        links: source.map((c, ci) => {
            return { url: c.url, title: c.title };
        }),
    }),
    { encoding: 'utf-8' }
);

// Create Category pages
source.forEach((category, cIndex) => {
    fs.writeFileSync(
        path.resolve(`./website/${category.url}`),
        template.listPage({
            title: `${category.title} | MaxReading Offline Clone`,
            heading: `${category.title}`,
            breadcrumb: [{ url: 'index.html', link: 'Home' }],
            current: `${category.title}`,
            links: category.children.map((g, gi) => {
                return { url: g.url, title: g.title };
            }),
        }),
        { encoding: 'utf-8' }
    );
});

// Create Group Pages
source.forEach((category, cIndex) => {
    category.children.forEach((group, gIndex) => {
        fs.writeFileSync(
            path.resolve(`./website/${group.url}`),
            template.listPage({
                title: `${group.title} | ${category.title} | MaxReading Offline Clone`,
                heading: `${group.title}`,
                breadcrumb: [
                    { url: 'index.html', link: 'Home' },
                    { url: `${category.url}`, link: `${category.title}` },
                ],
                current: `${group.title}`,
                links: group.children.map((p, pi) => {
                    return { url: p.url, title: p.title };
                }),
            }),
            { encoding: 'utf-8' }
        );
    });
});

// Create Pages
source.forEach((category, cIndex) => {
    category.children.forEach((group, gIndex) => {
        group.children.forEach((page, pIndex) => {
            let previous = itemShift(cIndex, gIndex, pIndex, false);
            if (previous) previous = previous.url;

            let next = itemShift(cIndex, gIndex, pIndex, true);
            if (next) next = next.url;

            fs.writeFileSync(
                path.resolve(`./website/${page.url}`),
                template.listPage({
                    title: `${page.title} | ${group.title} | ${category.title} | MaxReading Offline Clone`,
                    heading: `${page.title}`,
                    breadcrumb: [
                        { url: 'index.html', link: 'Home' },
                        { url: `${category.url}`, link: `${category.title}` },
                        { url: `${group.url}`, link: `${group.title}` },
                    ],
                    current: `${page.title}`,
                    links: undefined,
                    content: `${page.content}`.split('\n'),
                    previous: previous,
                    next: next,
                }),
                { encoding: 'utf-8' }
            );
        });
    });
});
