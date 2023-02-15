<?php
// $main_dir = dirname(__FILE__);
// parse_str($_SERVER['QUERY_STRING'],$params);
$page = substr(dirname($_SERVER['SCRIPT_NAME']),1);
?><!DOCTYPE HTML>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php
  if (empty($title)) $title = $page;
  echo $title;
?></title>
<link rel="icon" href="<?php
  echo (empty($icon) || !file_exists($icon) ? 'data:,' : $icon);
?>">
<?php
  if (!empty($styles)) {
    foreach ($styles as &$x) {
      if (file_exists($x)) {
        echo '<link rel="stylesheet" href="',$x,'" type="text/css">',"\n";
      }
    }
  }
?>
<script>
  const page = '<?php echo $page; ?>';
</script>
<?php
  if (!empty($styles)) {
    foreach ($scripts as &$x) {
      if (file_exists($x)) {
        echo '<script src="',$x,'"></script>',"\n";
      }
    }
  }
?>
</head>
<body>

<nav>
  <ul>
    <li><a href='/'>Home</a></li>
    <li><a href='/binning/'>Binning</a></li>
    <li><a href='/hgam/'>HGam</a></li>
    <li><span>Level 1</span>
      <ul>
        <li><span>Level 2 a</span>
          <ul>
            <li><span>Level 3 a</span>
            </li>
            <li><span>Level 3 b</span></li>
          </ul>
        </li>
        <li><a href="#">Level 2 b</a></li>
      </ul>
    </li>
  </ul>
</nav>
