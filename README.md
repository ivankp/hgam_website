# Setup
Clone the repository to the `www` directory of the http server.

## Binning page
1. Clone the [`hgam_website_binning`](https://github.com/ivankp/hgam_website_binning) repository somewhere else convenient.
2. Compile the code by running `make`.
3. Copy the compiled `hgam_website_binning/bin/binner` program to `hgam_website/binning/`.
4. Place data files in `hgam_website/binning/data/`. The data files are binary files created from data and MC MxAODs for specific variables.

The `Makefile` is set up to compile the `binner` program statically.
This should enable it to work with any Linux distribution, not only with the one on which it was compiled.
