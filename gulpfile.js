const gulp = require('gulp');
const concat = require('gulp-concat');
const chalk = require('chalk');
const args = require('yargs').argv;
const sass = require('gulp-sass');
const util = require('gulp-util');
const plumber = require('gulp-plumber');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const rename = require('gulp-rename');
const source_maps = require('gulp-sourcemaps');
const watchify = require('watchify');
const uglify = require('gulp-uglify');
const browser_sync = require('browser-sync').create();
const history_api_fb = require('connect-history-api-fallback');

// paths
const ENTRY_PATH = 'lib/main.js';
const DEST_PATH = 'build';

// if we are watching
let watch = false;

// our source files
const src = {
    web_pages: './*.html',
    sass: './styles/*.scss',
    images: './images/*.*'
};

// default task is to run build
gulp.task('default', ['build']);

gulp.task('project', () => {
    const name = args.name;
    if (!name) throw new Error('A name for the project must be specified!');

    gulp.src(
        ['./lib/*', './styles/*', './gulpfile.js', './*.html', './package.json'],
        { base: './' })
            .pipe(gulp.dest(name));
});

// main build task
gulp.task('build', ['html', 'sass', 'images', 'scripts']);

// called before watch starts
gulp.task('pre-watch', () => {
    watch = true;
});

// our watch task to watch files and perform other tasks
gulp.task('watch', ['pre-watch', 'build'], () => {
    gulp.watch(src.web_pages, ['html'])
        .on('change', () => {
            browser_sync.reload();
        });
    gulp.watch(src.sass, ['sass']);
    gulp.watch(src.images, ['images']);
});

// called to move any HTML documents into the destination folder
gulp.task('html', () =>
    gulp.src(src.web_pages)
        .pipe(gulp.dest(DEST_PATH)));

// build and move SCSS files to destination folder
gulp.task('sass', () =>
    gulp.src(src.sass)
        .pipe(source_maps.init())
        .pipe(plumber(function (error) {
            util.beep();
            console.log(
                chalk.gray('\n====================================\n') +
                '[' + chalk.magenta('SASS') + '] ' + chalk.red.bold('Error') +
                chalk.gray('\n------------------------------------\n') +
                chalk.yellow('Message:\n  ') +
                error.messageFormatted +
                chalk.gray('\n------------------------------------\n') +
                chalk.yellow('Details:') +
                chalk.green('\n  Line: ') + error.line +
                chalk.green('\n  Column: ') + error.column +
                chalk.gray('\n====================================\n')
            );
            this.emit('end');
        }))
        .pipe(sass())
        .pipe(source_maps.write())
        .pipe(concat('app.css'))
        .pipe(gulp.dest(DEST_PATH + '/css'))
        .pipe(browser_sync.stream()));

// called to move any images over
gulp.task('images', () =>
    gulp.src(src.images)
        .pipe(gulp.dest(DEST_PATH + '/images')));

gulp.task('scripts', () => {
    const bro = browserify({
        entries: './' + ENTRY_PATH,
        debug: true,
        transform: [babelify.configure({
            presets: ['es2015'],
            plugins: ['transform-react-jsx']
        })]
    });

    // Check if we should run through watchify
    let bundler = watch ? watchify(bro) : bro;

    bundler.on('update', () => {
        rebundle(bundler);
    });

    // our rebundle function
    const rebundle = bundler => {
        util.log('Browserify is bundling...');
        // tell browserify we are compiling
        browser_sync.notify('Browserify is bundling...');
        // default bundler to not have an error
        bundler.error = false;
        // send our bundler bundle back
        return bundler.bundle()
            .on('error', error => {
                // set bundler error to true to check for later
                bundler.error = true;
                // beep and give us the error
                util.beep();
                // tell browserify we got an error
                browser_sync.notify('Browserify Error!');
                // log the message
                console.log(
                    chalk.gray('\n====================================\n') +
                    '[' + chalk.blue('Browserify') + '] ' + chalk.red.bold('Error') +
                    chalk.gray('\n------------------------------------\n') +
                    chalk.yellow('Message:\n  ') + error.message +
                    chalk.gray('\n------------------------------------\n') +
                    error.codeFrame + '\n' +
                    chalk.gray('\n------------------------------------\n') +
                    chalk.yellow('Details:') +
                    chalk.green('\n  File: ') + error.filename +
                    chalk.green('\n  Line: ') + error.line +
                    chalk.green('\n  Column: ') + error.column +
                    chalk.gray('\n====================================\n')
                );
            })
            .pipe(source('app.js'))
            .pipe(buffer())
            .pipe(source_maps.init({ loadMaps: true }))
            .pipe(source_maps.write('./'))
            .pipe(gulp.dest(DEST_PATH + '/js'))
            .on('end', () => {
                // don't do anything if we have an error
                if (!bundler.error) {
                    // we are done bundling
                    util.log('Browserify finished bundling!');
                    // tell browserify we got an error
                    browser_sync.notify('Browserify finished bundling!');
                    // uglify the file
                    gulp.src(DEST_PATH + '/js/app.js')
                        .pipe(uglify())
                        .pipe(rename({ extname: '.min.js' }))
                        .pipe(gulp.dest(DEST_PATH + '/js'));

                    // tell browser sync to reload the page
                    browser_sync.reload();
                }
            });
    };

    // call the rebundle to bundle the app
    return rebundle(bundler);
});

// called to serve the files on localhost
gulp.task('serve', ['watch'], () => {
    browser_sync.init({
        server: {
            baseDir: DEST_PATH,
            middleware: [history_api_fb()]
        },
        host: 'project.localtest.me',
        open: 'external'
    });
});

