<?php
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
      if (preg_match('#^https?://#',$x) || file_exists($x)) {
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
      if (preg_match('#^https?://#',$x) || file_exists($x)) {
        echo '<script src="',$x,'"></script>',"\n";
      }
    }
  }
?>
