<?php

$title = 'H&rarr;&gamma;&gamma; event table';
$icon = '../favicon.ico';
$styles = [
  '../styles.css', 'styles.css'
];
$scripts = [
  '../common.js', 'script.js'
];

include '../head.php';

function endswith($haystack, $needle) {
  $N = strlen($haystack);
  $n = strlen($needle);
  if ($N < $n) return false;
  $offset = $N - $n;
  return strpos($haystack, $needle, $offset) === $offset;
}

$data_dirs = array();
if ($handle1 = opendir('data')) {
  while (false !== ($d = readdir($handle1))) {
    $dir = 'data/'.$d;
    if ($d[0]==='.' || !is_dir($dir)) continue;

    $data_files = array();

    if ($handle2 = opendir($dir)) {
      while (false !== ($f = readdir($handle2))) {
        if ($f[0]==='.' || !endswith($f,'_data.dat')) continue;
        $data_files[] = substr($f,0,strlen($f)-strlen('_data.dat'));
      }
    }
    if (count($data_files)) {
      $data_dirs[] = array($d,$data_files);
    }
  }
}

?>
<script>
const data = <?php echo json_encode($data_dirs,JSON_UNESCAPED_SLASHES);?>;
</script>
<?php
include '../nav.php';
?>

<div id="main">

<div id="top">
<h1>H&rarr;&gamma;&gamma; event table</h1>
</div>

<form>
<div>
  <table><tr>
    <td><label>Dataset:<select id="dataset" name="dataset"></select></label></td>
    <td><input type="submit" value="Show"></button></td>
    <td><img id="loading" src="../img/loading.gif" alt="loading" style="display:none;"></td>
    <td><span id="run_time"></span></td>
  </tr></table>
</div><div>
  <fieldset class="vars"><legend>Variables</legend>
    <table id="vars"></table><button id="add_var">&plus; var</button>
  </fieldset>
  <fieldset class="cuts"><legend>Cuts</legend>
    <table id="cuts"></table><button id="add_cut">&plus; cut</button>
  </fieldset>
</div>
</form>

<div id="event_count"></div>
<table id="event_table"></table>

</div>

<?php
include '../tail.php';
?>
