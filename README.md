# CarbonWordpress Example Repository 


Running `composer install` will download the necessary dependencies for the application. 

To change the installation location you must edit the `composer.json` file and change the `wordpress:install` script. 

```json
"scripts": {
    "wordpress:install": "$( composer run wp:cli ) core install --url=127.0.0.1:8080 --title=CarbonPHP --admin_user=root --admin_password=password --admin_email=test@example.co",
}
```

Any server changes will need to be made in the wp-config.php file. 

```php
/** The name of the database for WordPress */
define( 'DB_NAME', 'CarbonPHP' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'password' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );
```

