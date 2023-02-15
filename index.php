<?php

$title = '';
$icon = 'favicon.ico';
$styles = [ 'styles.css' ];
$scripts = [ 'common.js', 'script.js' ];

include 'head.php';
?>

<pre>
<?php
print_r($_SERVER);
// print_r($params);
// print_r($main_dir);
?>
</pre>

<?php
include 'tail.php';
?>
