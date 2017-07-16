var gulp = require('gulp');
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');

// Compile LESS files from /less into /css
gulp.task('less', function() {
    var f = filter(['**/*', '!**/mixins.less', '!**/variables.less']);
    return gulp.src('src/less/*.less')
        .pipe(f)
        .pipe(less())
        .pipe(gulp.dest('src/css'));
});

// Minify and concat compiled CSS
gulp.task('minify-css', ['less'], function() {
    return gulp.src('src/css/*.css')
        .pipe(concatCss("bundle.css"))
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist/css'));
});

// Minify JS
gulp.task('minify-js', function() {
    return gulp.src('src/js/*.js')
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist/js'));
});

// Copy HTML
gulp.task('copy-html', function() {
  gulp.src('src/index.html')
    .pipe(gulp.dest('dist'));
});

// Copy all static assets
gulp.task('copy-assets', function() {
  gulp.src('src/assets/**')
    .pipe(gulp.dest('dist/assets'));
});

// Run everything
gulp.task('default', ['less', 'minify-css', 'minify-js', 'copy-html', 'copy-assets']);
