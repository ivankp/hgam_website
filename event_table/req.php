<?php
$q = $_SERVER['QUERY_STRING'];
header('Content-Type: application/json');
if (strpbrk($q,'\'"')) {
  echo '{"error":"bad request"}';
} else {
  passthru('timeout 5s ./event_table \''.$q.'\'',$ret);
  if ($ret > 1) echo '{"error":"failed to run event_table backend"}';
}
?>
