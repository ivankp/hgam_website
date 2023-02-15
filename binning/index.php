<?php

$title = 'H&rightarrow;&gamma;&gamma; binning tool';
$icon = '../favicon.ico';
$styles = [ '../styles.css', 'styles.css' ];
$scripts = [ '../common.js', 'script.js' ];

include '../head.php';
?>

<script>
// const dir = "<?php echo $dir;?>";
// const mxaods = <?php include 'mxaods.json';?>;
const data_lumi = 100;
const vars = [<?php
  $file = fopen('vars.txt','r');
  while (!feof($file)) {
    if (preg_match('/^(\w+)\s*$/',fgets($file),$m))
      echo '"'.$m[1].'",';
  }
  fclose($file);
?>];
</script>

<div class="row">
<div class="col" style="min-width:475px;">

<div class="top">
<p>H&rightarrow;&gamma;&gamma; binning estimator</p>
</div>

<form>
  <div>
    <label>Luminosity:<input type="text" name="lumi" size="6">ifb</label>
    <span id="true_lumi"></span>
  </div><div>
    <select name="var"></select>
    <input list="edges_list" type="text" name="edges" size="30" autocomplete="off">
    <datalist id="edges_list"></datalist>
    <input type="submit" value="Rebin">
    <img id="loading" src="../img/loading.gif" alt="loading">
    <span id="run_time"></span>
  </div><div class="checks">
    <label><input name="click" type="checkbox">
      click row to show backround fit</label>
    <label><input name="unc" type="checkbox">
      show uncertainties</label>
  </div>
</form>
<div id="table"></div>

<div class="note">
<p>sig - number of signal events, taken from Monte Carlo.</p>
<p>bkg - number of background events in the signal region, estimated from data
sidebands.</p>
<p>signal systematic uncertainty - square root of sum of MC event weights.</p>
<p>Background in the signal region is estimated by a fit to the
<span class="math">m_yy</span> sidebands.<br>
The fit is done using a weighted linear least-squares
<a href="https://www.gnu.org/software/gsl/doc/html/lls.html#c.gsl_multifit_wlinear"
   target="_blank"
>algorithm</a>.<br>
A second degree polynomial is fit to
<span class="math">log</span>s of bin counts.
</p>
<p>The second significance column labelled Cowan is calculated using equation
<span class="root math">2[(s+b)log(1+s/b)-s]</span>.<br>
See the
<a href="https://www.pp.rhul.ac.uk/~cowan/stat/notes/SigCalcNote.pdf"
   target="_blank"
>"Discovery significance ..."</a> note by Glen Cowan.
</div>

<table id="lumi_info"></table>

</div>
<div class="col">
  <div id="mxaods"><p>MxAOD files <span class="show">[show]</span></p></div>
  <div id="reco_migr"><p>Reco migration <span class="show">[hide]</span></p>
    <div id="reco_migr_plot"></div>
  </div>
  <div id="fit_plot"></div>
</div>
</div>

<?php
include '../tail.php';
?>
