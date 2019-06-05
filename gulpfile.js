var path = require('path');
var gulp = require('gulp');
var del = require('del');
var merge = require('merge2');
var ts = require('gulp-typescript');
let tslint = require('gulp-tslint');


gulp.task('clean', () => {
    return del([
        'definitions/',
        'test/',
        'lib/',
        './test/**/*.js',
        './src/**/*.js',
        './src/**/*.d.ts',
        './index.js',
        './app.js'
    ]);

});

gulp.task('tslint', () => {
    return gulp.src("src/**/*.ts")
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report())
});


gulp.task('ts', () => {
    const tsProject = ts.createProject(path.resolve('./tsconfig.json'));
    const tsResult = gulp.src(['./src/**/*.ts', '!./src/test/**']).pipe(tsProject());
    return merge([
        tsResult.dts.pipe(gulp.dest('./definitions')),
        tsResult.js.pipe(gulp.dest(path.resolve('./')))
    ]);

});

gulp.task('test', () => {
    const tsProject = ts.createProject(path.resolve('./tsconfig.json'));
    const tsResult = gulp.src(['./src/test/**/*.ts']).pipe(tsProject());
    return tsResult.js.pipe(gulp.dest(path.resolve('./test')))
});



gulp.task('build', gulp.series('clean', 'tslint', 'ts', 'test'));
gulp.task('default', gulp.series('build'));