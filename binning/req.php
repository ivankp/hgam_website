<?php
header('Content-Type: application/json');
echo exec('./binner \''.$_SERVER['QUERY_STRING'].'\'');
?>
