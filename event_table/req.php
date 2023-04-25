<?php
header('Content-Type: application/json');
passthru('./event_table \''.$_SERVER['QUERY_STRING'].'\'',$ret);
if ($ret > 1) echo '{"error":"failed to run event_table backend"}';
?>
