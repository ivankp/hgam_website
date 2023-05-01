# Setup
Clone the repository to the `www` directory of the http server.

## Binning page
The page relies on two things.
1. The `binner` program
2. Input data for the observables

The `binner` program contained in this repository should work with any Linux
distribution. However, if for some reason it doesn't work (e.g. the kernel may
be sufficiently incompatible), follow the instructions in the
[`hgam_website_backend`](https://github.com/ivankp/hgam_website_backend)
repository, which contains the source code for the `binner` program,
to compile a compatible version.

The data files can be generated from `MxAODs` or `uMxAODs` by using the
`convert_mxaods` program in the
[`hgam_website_backend`](https://github.com/ivankp/hgam_website_backend)
repository.
Follow the respective instructions there to make them.

The data files need to be places in a directory corresponding to the dataset
(e.g. representing data from a specifit LHC run) inside the `data` directory.
For example:
```
.
├── data
│   └── 2022_13.7TeV_37.8ifb
│       ├── catXS_VBF_data.dat
│       ├── catXS_VBF_mc.dat
│       ├── m_yy_data.dat
│       ├── m_yy_mc.dat
│       ├── N_j_30_data.dat
│       ├── N_j_30_mc.dat
│       ├── pT_j1_30_data.dat
│       ├── pT_j1_30_mc.dat
│       ├── pT_yy_data.dat
│       ├── pT_yy_mc.dat
│       ├── mxaods.json
│       └── vars.json
```

Besides the data files, the data directory needs to contain `vars.json` and
`mxaods.json` files.
`vars.json` lists the variables which will be available on the web page and
default options for their binning.
`mxaods.json` lists the MxAOD files used to generate the data files.
