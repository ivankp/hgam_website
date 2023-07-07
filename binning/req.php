<?php
$q = $_SERVER['QUERY_STRING'];
header('Content-Type: application/json');
if (strpbrk($q,'\'"')) {
  echo '{"error":"bad request"}';
} else {
  passthru('timeout 5s ./binner \''.$q.'\'',$ret);
  if ($ret > 1) echo '{"error":"failed to run binner"}';
}
?>
