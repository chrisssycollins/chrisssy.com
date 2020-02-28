const {
    DateTime
} = require("luxon");
const htmlmin = require("html-minifier");
const yaml = require("js-yaml");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const inclusiveLangPlugin = require("@11ty/eleventy-plugin-inclusive-language");
const readingTime = require('eleventy-plugin-reading-time');
// Filters
const webmentionsFilter = require('./src/_filters/webmentions-filter.js');
const likesFilter = require('./src/_filters/likes-filter.js');
var sizeOf = require('image-size');
const ColorThief = require('colorthief');

module.exports = function (eleventyConfig) {
    // Folders to copy to build dir (See. 1.1)
    eleventyConfig.addPassthroughCopy("src/static");
    eleventyConfig.addPassthroughCopy("src/log/**/*.{jpg,jpeg}");

    if (process.env.ELEVENTY_ENV === 'production') {
        // Minify HTML output
        eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
            if (outputPath && outputPath.endsWith(".html")) {
                let minified = htmlmin.minify(content, {
                    useShortDoctype: true,
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true
                });
                return minified;
            }
            return content;
        });
    }

    eleventyConfig.addFilter('likesFilter', likesFilter);
    eleventyConfig.addFilter('webmentionsFilter', webmentionsFilter);

    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    eleventyConfig.addFilter('htmlDateString', (dateObj) => {
        return DateTime.fromJSDate(dateObj, {
            zone: 'utc'
        }).toFormat('yyyy-LL-dd');
    });

    eleventyConfig.addFilter('urlDate', (dateObj) => {
        return DateTime.fromJSDate(dateObj, {
            zone: 'utc'
        }).toFormat('dd-LL-yyyy');
    });

    eleventyConfig.addFilter("readableDate", dateObj => {
        return DateTime.fromJSDate(new Date(dateObj), {
            zone: 'utc'
        }).toFormat("dd LLL yyyy");
    });

    eleventyConfig.addFilter("simpleDate", dateObj => {
        return DateTime.fromJSDate(new Date(dateObj), {
            zone: 'utc'
        }).toFormat("dd.LL.yy");
    });

    eleventyConfig.addFilter("w3cDate", function (date) {
        return date.toISOString();
    });


    eleventyConfig.addFilter("media", function (filename, page) {
        console.log('FILENAME: ' + filename, 'PAGE: ' + page);

        const path = page.inputPath.split('/')
        if (path.length && path.includes('log')) {
            const subdir = path[path.length - 2]
            return `/static/log/${subdir}/${filename}`
        }
        return filename
    });

    eleventyConfig.addNunjucksAsyncShortcode("photo", function (img) {
        let imgPath = `./src${img.context}${img.src}`;
        let d = sizeOf(imgPath);

        return ColorThief.getColor(imgPath).then(color => {
            return `<figure class="-mx-6 md:mx-0 my-8">
                <div class="relative" style="background-color: rgba(${color},1); padding-bottom: calc(${d.height}/${d.width} * 100%);">
                    <img class="lazy w-full h-full absolute object-cover top-0 left-0" src="/static/image-placeholder.png" data-src="${img.src}">
                    <span style="font-size: 0.5rem;" class="bottom-0 right-0 absolute text-white p-2 uppercase tracking-widest opacity-50">© All Photos Copyright Chris Collins</span>
                </div>
                ${img.caption ? `<figcaption class="py-3 px-6 md:p-4 text-sm dark-mode:bg-gray-900 dark-mode:text-white bg-gray-100 text-black">${img.caption}</figcaption>` : ''}
            </figure>`;
        })
    });

    // Add YAML support for data files
    eleventyConfig.addDataExtension("yaml", contents => yaml.safeLoad(contents));

    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(pluginRss);
    // eleventyConfig.addPlugin(inclusiveLangPlugin);
    eleventyConfig.addPlugin(readingTime);

    eleventyConfig.addCollection("log", function (collection) {
        return collection.getFilteredByGlob("src/log/**/*.md").sort(function (a, b) {
            return new Date(b.data.date) - new Date(a.data.date);
        });
    });


    return {
        dir: {
            input: "src/",
            output: "dist",
            includes: "_includes",
            layouts: "_layouts"
        },
        templateFormats: ["html", "md", "njk"],
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: 'njk',

        // 1.1 Enable eleventy to pass dirs specified above
        passthroughFileCopy: true
    };
};