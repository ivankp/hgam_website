<?php

$title = 'H&rarr;&gamma;&gamma; binning tool';
$icon = '../favicon.ico';
$styles = [
  '../styles.css', 'styles.css'
];
$scripts = [
  '../js/d3.v6.min.js',
  '../js/d3-color.v1.min.js',
  '../js/d3-selection-multi.v1.min.js',
  '../js/d3-plot.js',
  '../common.js', 'script.js'
];

include '../head.php';

$data_dirs = array();
if ($handle = opendir('data')) {
  while (false !== ($entry = readdir($handle)))
    if ($entry[0]!=='.' && is_dir('data/'.$entry))
      $data_dirs[] = $entry;
}
arsort($data_dirs);

$data = array();
foreach ($data_dirs as $d) {
  $dd = 'data/'.$d.'/';
  $vars = json_decode(file_get_contents($dd.'vars.json'));
  foreach ($vars as $k => $v) {
    if (
      !file_exists($dd.$k.'_data.dat') ||
      !file_exists($dd.$k.'_mc.dat')
    ) {
      unset($vars->{$k});
    }
  }
  $data[] = array($d,$vars);
}
?>
<script>
const data = <?php echo json_encode($data,JSON_UNESCAPED_SLASHES);?>;
const mxaods = <?php include 'data/'.$data_dirs[0].'/mxaods.json';?>;
</script>
<?php
include '../nav.php';
?>

<div id="main">

<div id="top">
<p>H&rarr;&gamma;&gamma; binning estimator</p>
</div>
<div id="mid">
<div id="left">

<form>
  <div>
    <span class="small">Bin width:</span>
    <label>Data:<input type="text" name="wd" size="6">GeV</label>,
    <label>MC:<input type="text" name="wm" size="6">GeV</label>
  </div><div>
    <label><input name="fitmc" type="checkbox">
      fit signal distribution</label>
  </div><div>
    <label>Luminosity:<input type="text" name="lumi" size="6">ifb</label>
    <span id="data_lumi"></span>
  </div><div>
    <table id="form_table_wrap"><tr>
      <td><table id="form_table"></table></td>
      <td><input type="submit" value="Rebin"></td>
      <td><img id="loading" src="../img/loading.gif" alt="loading" style="display:none;"></td>
      <td><span id="run_time"></span></td>
    </tr></table>
  </div><div>
    <label><input name="click" type="checkbox">
      click row to show backround fit</label>
    <label><input name="unc" type="checkbox">
      show uncertainties</label>
  </div>
</form>

<div id="main_table"></div>

<div id="mid-left"></div>

<div id="note">
<p>sig - number of signal events, taken from Monte Carlo.</p>
<p>bkg - number of background events in the signal region, estimated from data
sidebands.</p>
<p>signal systematic uncertainty - square root of sum of MC event weights.</p>
<p>Background in the signal region is estimated by a fit to the
<span class="math">m_yy</span> sidebands.<br>
The fit is done using a weighted linear least-squares
<a href="https://github.com/ivankp/hgam_website_binning/blob/main/src/least_squares.c"
   target="_blank"
>algorithm</a>.<br>
A second degree polynomial is fit to
<span class="math">log</span>s of bin counts.
</p>
<p>The second significance column labelled Cowan is calculated using equation
<span class="math nowrap">&radic;<span class="bar">2[(s+b)log(1+s/b)-s]</span></span>.<br>
See the
<a href="https://www.pp.rhul.ac.uk/~cowan/stat/notes/SigCalcNote.pdf"
   target="_blank"
>"Discovery significance ..."</a> note by Glen Cowan.
</div>

</div>
<div id="right">

<div id="pane">
  <div id="mxaods"><p>MxAOD files <span class="show">[show]</span></p></div>
  <div id="mig"><p>Reco migration <span class="show">[hide]</span></p></div>
  <div id="data_plot"></div>
  <div id="mc_plot"></div>
</div>

</div>
</div>
</div>

<?php
include '../tail.php';
?>
