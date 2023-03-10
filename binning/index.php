<?php

$title = 'H&rarr;&gamma;&gamma; binning tool';
$icon = '../favicon.ico';
$styles = [
  '../styles.css', 'styles.css'
];
$scripts = [
  '../js/d3.v6.min.js',
  '../js/d3-color.v1.min.js',
  '../common.js', 'script.js'
];

include '../head.php';

$binning = json_decode(file_get_contents('vars.json'));
foreach ($binning as $k => $v) {
  if (
    !file_exists('data/'.$k.'_data.dat') ||
    !file_exists('data/'.$k.'_mc.dat')
  ) {
    unset($binning->{$k});
  }
}
?>
<script>
const binning = <?php echo json_encode($binning);?>;
const mxaods = <?php include 'mxaods.json';?>;
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
    <label>Luminosity:<input type="text" name="lumi" size="6">ifb</label>
    <span id="data_lumi"></span>
  </div><div>
    <table id="form_table_wrap"><tr>
      <td><table id="form_table"></table></td>
      <td><input type="submit" value="Rebin"></td>
      <td><img id="loading" src="../img/loading.gif" alt="loading" style="display:none;"></td>
      <td><span id="run_time"></span></td>
    </tr></table>
  </div><div class="checks">
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
  <div id="fit_plot"></div>
</div>

</div>
</div>
</div>

<?php
include '../tail.php';
?>
