<?php

/**
 * I actually learned something about php's internal server with this file.
 * If you return false for a file that exists, php will default to
 * resolve it an return it.
 */

$root = $_SERVER['DOCUMENT_ROOT'];

$path = '/' . ltrim(parse_url(urldecode($_SERVER['REQUEST_URI']))['path'], '/');


if (is_dir($root . $path)) {

    $index = __DIR__ . DIRECTORY_SEPARATOR . $path . DIRECTORY_SEPARATOR . 'index.php';

    if (file_exists($index)) {

        require_once $index;

    } else {

        require_once __DIR__ . DIRECTORY_SEPARATOR . '/index.php';
    }

    exit;

}

if (file_exists($root . $path)) {

    // Runs PHP file if it exists
    if (str_ends_with($path, '.php')) {

        chdir(dirname($root . $path));

        if (false === include $root . $path) {

            error_log('Failed including file :: ' . $root . $path . PHP_EOL);

            exit(1);

        }

        return true;

    }

    $fp = fopen($root . $path, 'rb');

    fpassthru($fp);

    fclose($fp);

    return true;

}

// Otherwise, run `index.php`
chdir($root);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'index.php';
