<?php
header('Content-Type: application/json');
passthru('./binner \''.$_SERVER['QUERY_STRING'].'\'',$ret);
if ($ret > 1) echo '{"error":"failed to run binner"}';
?>
