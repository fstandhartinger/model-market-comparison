"""Fixed-order offline runtime supplement for Krino-2B (paid fast-lane order 8c7dbe11).

Kev requires Python 3.12+ and torch below 2.9. This supplement overlays the order's digest-pinned
PyTorch CUDA runtime base with Kev's full cp312 Linux x86_64 uv.lock closure, including torch 2.8.0
and its CUDA wheels. The Docker build is offline and uses only the SHA-256-pinned context members.
The customer code tree is mounted separately by the trusted runner; this host module imports no
model stack and executes no customer or Kev code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '8c7dbe11-5695-45d7-b701-cf92dab3ada7'
BASE_IMAGE = 'pytorch/pytorch:2.11.0-cuda12.8-cudnn9-runtime@sha256:eee11b3b3872a8c838e35ef48f08b2d5def2080902c7f666831310ca1a0ef2be'
CONTEXT = Path('/home/flori/jobs/fastlane-backlog-today-20261012/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '0f1ed27192b0a23120221a7a33f6f86f99a7b796ba7383837fe599afd14c060a'
FILES = {
    "Dockerfile.runtime-supplement": "19796a36c7c9af14d4b7eaa8823b5a60430f07199a195ef9374f0e52109ec6ff",
    "kev-source/LICENSE": "6b08bb37982c233aa12bcbdf19106da12f3f4fcf800773ea42e28ebeddd34fb8",
    "kev-source/README.md": "19c9d7d30cd723b9f112f1f68d0b415a28c5ee616dbc21b358fc29bd07a66311",
    "kev-source/kev/__init__.py": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "kev-source/kev/anchors.py": "6963eafdb276db5a6c94d939eae675c761555553b8d0f963ffd803448beaabbb",
    "kev-source/kev/api.py": "a6f53af5354f8ea17915abc78360fdf291a5108ce39a53a2d9135d48c603ae58",
    "kev-source/kev/autoresearch.py": "7c62762b99c1b081bef06aa1ce83f8dfccce8ac7e9d2c5c0ab4d058055c7eab1",
    "kev-source/kev/benchmark.py": "82e6a935472f170da48ec37eee8986c519595c4943f6f3040ec67b5da3afb278",
    "kev-source/kev/budget.py": "246b5ca6450567a61b881308c9482cf1af6ecba599ca161af1febb23d6dc28a7",
    "kev-source/kev/calibrate.py": "435ac98696fbd329c3a07f0c12633ba3c09a846f0e9c92e17540bbf8ba2986f8",
    "kev-source/kev/checkpoint.py": "02062399977ee0da316dd52e03a79fa5e10134aa49c0b5ed801598c52042dc32",
    "kev-source/kev/compare.py": "3606dbf98bb305d66420158498cb837304d2edb8dab01cdaf2ec42964bef3435",
    "kev-source/kev/composition.py": "f335ed17e18e0a544893db5e22b9a059e6ce1b2e14dbb863ac7d7bbf8f3e0536",
    "kev-source/kev/contrastive.py": "cbb979aa5d40265ad0e64695f94b281d91751fa405811ddfa8212fede111edcf",
    "kev-source/kev/cuda_graphs.py": "5ce84f0e4e5ad2177314ed3ecc9564d45d14ad9eb422e0fb079c9e1cbbb011b6",
    "kev-source/kev/data.py": "e77a2fffeb8ee7e05b118893be8e38b8358aef97c3ca2e143cdce208201b92f9",
    "kev-source/kev/device.py": "bda81dff5be33c59eee8de76e534976cc137a2661da6afd2a67abb85d8dad4a2",
    "kev-source/kev/evaluate.py": "b2a6fbad7a1494728ea8d9ed0ad54ae23ff2ee1d543444fd0c3c110da4ab07cc",
    "kev-source/kev/experiment.py": "3fd13a86f111dfd3292af9448df0ee28bd9596e3a77c1391f318cd654be14e8a",
    "kev-source/kev/full_ft.py": "c3abef39cd9d486b3c075a37286afbcd1aa42a04c78a1b7b9b2e77b5a3963929",
    "kev-source/kev/fused_qwen35.py": "5d2e587808822ce539ff52f63024357630b67a65f88cd734b82fd488655aebed",
    "kev-source/kev/jev.py": "5488645c4fc2a53ca430e556ebfb744736e1a156bd121bd10ba0a9935f423e1c",
    "kev-source/kev/metrics.py": "167a586334cfcced4adcc197758535c3bcda832b855c151095ef2d1968cf8983",
    "kev-source/kev/mirror.py": "ca2284c670ce2cf1db57231968b9e6cbc01955f8f3c9a3207fd82e73d7b476b6",
    "kev-source/kev/mlx_model.py": "49c4a3de3952429e8a4b3945c33b0697a1cd84c41c945709ce6619af2c15842c",
    "kev-source/kev/model.py": "2ff3b2e67c048e3bc5a0d1a32aafe50804ed315a5564fce06bb4b95697c5271c",
    "kev-source/kev/plot.py": "0874bcff2885d8155a1cceade0de8a275a7163d3c3fd6aa0c294e8ccf5ff7e02",
    "kev-source/kev/predictors.py": "29263ae3297e5cde6cf03da5c5aa3ed377c9681c6a5a639ea4aa259acec7575b",
    "kev-source/kev/publish.py": "fcb490a374fc9ef330424ad4a75ce281ab08d2cb04dff2ad912c5f4dae6ab8a7",
    "kev-source/kev/rounds.py": "2975bede7250812aecea36b17c0aefda6b389dc3a50e782e82e7566a7168c270",
    "kev-source/kev/serve.py": "4f9885ce179dcb7de743f59be4b561758f47fac09373525e2994860b3345b162",
    "kev-source/kev/shared_prefix.py": "bc6dedbad734cca227f3ec6746223b3b03363b0c045aa9f2493d886b1828e71e",
    "kev-source/kev/study_v3.py": "7891150aa623e4479c7c789d4dc4662f186132b37b7bac1e1f072b9e08ee13e3",
    "kev-source/kev/suite.py": "8e7d257a10b4704d7bf4f8ec2c74dddf26aa5a2a610ea78610360e6baf43eff5",
    "kev-source/kev/train.py": "de0b0971defd79c053d56f8e8b17b0501b2e264e93a66a8d5493f1b1ba839416",
    "kev-source/kev/transfer_v9.py": "0902409742151250a28af1fd8f42258b70fcc161f3deed3ee35fe3f473f3c763",
    "kev-source/pyproject.toml": "7c17fbe9efcadda3eb488b59adf1b6db5938cd33af4d3bd389ce4359b73fcc7d",
    "runtime-supplement-requirements.lock.txt": "0f2571503dec48a7117da5e9ea7e55835364a51311cba6a3b7f552c7dc89ea80",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.15.1-py3-none-any.whl": "6152fdbbf9a77fdec97731721bebf7c4c44f7c29b424b0065826173efc7ed101",
    "wheels/certifi-2026.7.22-py3-none-any.whl": "62f22742b58a1a33014a2b6b706588a8d7e2a88ae7bd1a6ebe8c992928483775",
    "wheels/charset_normalizer-3.5.1-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "b9af956078716df40d985fb0dfeb2c2120c5ca92ba4ff4b388acfd01cdc14d08",
    "wheels/charset_normalizer-3.5.1-cp37-abi3-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl": "a6dac12ff6b846103483683f60c5f8fee205121adc58ffd87e90a90a3af69e99",
    "wheels/charset_normalizer-3.5.1-py3-none-any.whl": "6df0ec430f9a831772c23ca5a224cba36517a58a84bb32c32bb59a9fa67c47f6",
    "wheels/click-8.5.0-py3-none-any.whl": "255bc9599cf7748b4b1a446ccc735421bd08a2ae529a8b88597d3de5664ee360",
    "wheels/cloudpickle-3.1.2-py3-none-any.whl": "9acb47f6afd73f60dc1df93bb801b472f05ff42fa6c84167d25cb206be1fbf4a",
    "wheels/colorama-0.4.6-py2.py3-none-any.whl": "4f1d9991f5acc0ca119f9d443620b77f9d6b33703e51011c16baf57afb285fc6",
    "wheels/datasets-5.0.1-py3-none-any.whl": "9fbf73688f8c18f7529b4fe592abd04015f81d1e58001e4bac73ffb2b39d7cc4",
    "wheels/dill-0.4.1-py3-none-any.whl": "1e1ce33e978ae97fcfcff5638477032b801c46c7c65cf717f95fbc2248f79a9d",
    "wheels/fastapi-0.141.1-py3-none-any.whl": "bfb91aa2d334c61cb35ba9a116fc123b3d3df31640b801cf57a7a78ec3f603b3",
    "wheels/filelock-4.0.0-py3-none-any.whl": "a850aa9ec2acba8db9ca2e9fcf8a327fbc2f85e432725715b37bd76b7dd1f798",
    "wheels/fsspec-2026.6.0-py3-none-any.whl": "02e0b71817df9b2169dc30a16832045764def1191b43dcff5bb85bdee212d2a1",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.6.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "d62671bb130879cef0ee4c9ebe47a14af6c66ec53e6d84dc15936e5ffdfac82f",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpcore2-2.13.0-py3-none-any.whl": "35ae5be347aa40467b4a5dc032ac67ebb6d27189fc97e8cebcf99616f6a1bb9e",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/httpx2-2.13.0-py3-none-any.whl": "fc12720cedf72faa26cca6b4ca394e05c894e7d7933fc45cafe767960804e49a",
    "wheels/httpx2_jsfetch-1.0-py3-none-any.whl": "cb916b707601e69a07721aabc8f3f6659be3a6893bc1ff5c6f9e02241df2da32",
    "wheels/huggingface_hub-1.32.0-py3-none-any.whl": "b0c7c80561969d9cdacdd55fce67ba9584cca0b9d4ea80957a3a5c1445fac5c8",
    "wheels/idna-3.20-py3-none-any.whl": "ab7ae7122974553370f0bdb919e1a960b2cd1bc1ef0276416d896db81c14582c",
    "wheels/jinja2-3.1.6-py3-none-any.whl": "85ece4451f492d0c13c5dd7c13a64681a86afae63a5f347908daf103ce6d2f67",
    "wheels/joblib-1.6.0-py3-none-any.whl": "3dbbf9f6e4b592a2357b854608e980fe6390d131d7a82f011a377ef2ebef7aba",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/markupsafe-3.0.3-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "d6dd0be5b5b189d31db7cda48b91d7e0a9795f31430b7f271219ab30f1d3ac9d",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/mpmath-1.3.0-py3-none-any.whl": "a0b2b9fe80bbcd81a6647ff13108738cfb482d481d826cc0e02f5b35e5c88d2c",
    "wheels/msgspec-0.21.1-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "21995e74b5c598c2e004110ad66ec7f1b8c20bf2bcf3b2de8fd9a3094422d3ff",
    "wheels/multiprocess-0.70.19-py310-none-any.whl": "97404393419dcb2a8385910864eedf47a3cadf82c66345b44f036420eb0b5d87",
    "wheels/multiprocess-0.70.19-py311-none-any.whl": "928851ae7973aea4ce0eaf330bbdafb2e01398a91518d5c8818802845564f45c",
    "wheels/multiprocess-0.70.19-py312-none-any.whl": "3a56c0e85dd5025161bac5ce138dcac1e49174c7d8e74596537e729fd5c53c28",
    "wheels/multiprocess-0.70.19-py313-none-any.whl": "8d5eb4ec5017ba2fab4e34a747c6d2c2b6fecfe9e7236e77988db91580ada952",
    "wheels/multiprocess-0.70.19-py39-none-any.whl": "0d4b4397ed669d371c81dcd1ef33fd384a44d6c3de1bd0ca7ac06d837720d3c5",
    "wheels/narwhals-2.26.0-py3-none-any.whl": "29326d74f107c347fd1009bd58e38d9f7c7c5b51e6de97bc93dbc325d9038b54",
    "wheels/networkx-3.6.1-py3-none-any.whl": "d47fbf302e7d9cbbb9e2555a0d267983d2aa476bac30e90dfbe5669bd57f3762",
    "wheels/numpy-2.5.3-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "b7e18c623bb5c95acb3b3328861272816ba199fb531921c5d6d0b675f1fde9e3",
    "wheels/nvidia_cublas_cu12-12.8.4.1-py3-none-manylinux_2_27_x86_64.whl": "8ac4e771d5a348c551b2a426eda6193c19aa630236b418086020df5ba9667142",
    "wheels/nvidia_cuda_cupti_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "ea0cb07ebda26bb9b29ba82cda34849e73c166c18162d3913575b0c9db9a6182",
    "wheels/nvidia_cuda_nvrtc_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl": "a7756528852ef889772a84c6cd89d41dfa74667e24cca16bb31f8f061e3e9994",
    "wheels/nvidia_cuda_runtime_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "adade8dcbd0edf427b7204d480d6066d33902cab2a4707dcfc48a2d0fd44ab90",
    "wheels/nvidia_cudnn_cu12-9.10.2.21-py3-none-manylinux_2_27_x86_64.whl": "949452be657fa16687d0930933f032835951ef0892b37d2d53824d1a84dc97a8",
    "wheels/nvidia_cufft_cu12-11.3.3.83-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "4d2dd21ec0b88cf61b62e6b43564355e5222e4a3fb394cac0db101f2dd0d4f74",
    "wheels/nvidia_cufile_cu12-1.13.1.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "1d069003be650e131b21c932ec3d8969c1715379251f8d23a1860554b1cb24fc",
    "wheels/nvidia_curand_cu12-10.3.9.90-py3-none-manylinux_2_27_x86_64.whl": "b32331d4f4df5d6eefa0554c565b626c7216f87a06a4f56fab27c3b68a830ec9",
    "wheels/nvidia_cusolver_cu12-11.7.3.90-py3-none-manylinux_2_27_x86_64.whl": "4376c11ad263152bd50ea295c05370360776f8c3427b30991df774f9fb26c450",
    "wheels/nvidia_cusparse_cu12-12.5.8.93-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "1ec05d76bbbd8b61b06a80e1eaf8cf4959c3d4ce8e711b65ebd0443bb0ebb13b",
    "wheels/nvidia_cusparselt_cu12-0.7.1-py3-none-manylinux2014_x86_64.whl": "f1bb701d6b930d5a7cea44c19ceb973311500847f81b634d802b7b539dc55623",
    "wheels/nvidia_nccl_cu12-2.27.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "adf27ccf4238253e0b826bce3ff5fa532d65fc42322c8bfdfaf28024c0fbe039",
    "wheels/nvidia_nvjitlink_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl": "81ff63371a7ebd6e6451970684f916be2eab07321b73c9d244dc2b4da7f73b88",
    "wheels/nvidia_nvtx_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "5b17e2001cc0d751a5bc2c6ec6d26ad95913324a4adb86788c944f8ce9ba441f",
    "wheels/packaging-26.3-py3-none-any.whl": "d7193f7c8e4e93f444fde0262bf90af30e16fa0ad0ad44cb553c87339b23cd1c",
    "wheels/pandas-3.0.5-cp312-cp312-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl": "d373ce03ffd84010ed9839fa73672a9c8256990532e158440c0085db7d914b34",
    "wheels/peft-0.21.0-py3-none-any.whl": "b64eb75fd9dece7401c70e675b8d9de024993b70483691b41c62876f0c7809b7",
    "wheels/psutil-7.2.2-cp36-abi3-manylinux2010_x86_64.manylinux_2_12_x86_64.manylinux_2_28_x86_64.whl": "076a2d2f923fd4821644f5ba89f059523da90dc9014e85f8e45a5774ca5bc6f9",
    "wheels/pyarrow-25.0.1-cp312-cp312-manylinux_2_28_x86_64.whl": "5389cdf79447ed1515c9e31620e6e1e2302249564d603f2ad727d4f6d313e4c3",
    "wheels/pydantic-2.13.5-py3-none-any.whl": "346a034f080da3755d8e9cb5e00e8b07de1d39e4f6e2c87d8ab7cafa0b269a73",
    "wheels/pydantic_core-2.46.5-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "0fc5be0abd4a407e200d844b404e33639a554e7bd0d448e7b9ae181be4789ac2",
    "wheels/pygments-2.21.0-py3-none-any.whl": "2363c69b61c4a97c838da3b130dcd6468f4848992b21a82f2a63ec34377137d9",
    "wheels/python_dateutil-2.9.0.post0-py2.py3-none-any.whl": "a8b2bc7bffae282281c8140a97d3aa9c14da0b136dfe83f850eea9a5f7470427",
    "wheels/pyyaml-6.0.3-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "ba1cc08a7ccde2d2ec775841541641e4548226580ab850948cbfda66a1befcdc",
    "wheels/regex-2026.9.10-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "2e67f8843f0e4b931f1fa860bf3bbe4134b714c0155cc5c7c0d7ea450230aae0",
    "wheels/requests-2.34.2-py3-none-any.whl": "2a0d60c172f83ac6ab31e4554906c0f3b3588d37b5cb939b1c061f4907e278e0",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/scikit_learn-1.9.1-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "e5d7b18a5b9dca241a74695f3275fa4c895a9dadc72b3d8df5fa9d1083c9b83e",
    "wheels/scipy-1.18.1-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "f55fa87b6c612ecd6b058f167c53231b1d14e412efe361d3d6e38b3631c73218",
    "wheels/setuptools-84.0.0-py3-none-any.whl": "51a52592b3b99e102b609654876bd65f19f999935166d1352678931132b0c670",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/six-1.17.0-py2.py3-none-any.whl": "4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274",
    "wheels/starlette-1.6.0-py3-none-any.whl": "a86dd39d14bb45f85a3d18525215a9ef0cfd1f192ac793220e72598c90335f0c",
    "wheels/sympy-1.14.0-py3-none-any.whl": "e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5",
    "wheels/tenacity-9.1.4-py3-none-any.whl": "6095a360c919085f28c6527de529e76a06ad89b23659fa881ae0649b867a9d55",
    "wheels/threadpoolctl-3.7.0-py3-none-any.whl": "cd8b60b5641b45c67bbf73c64c843235fc2d8a480c87389f52f5dbee893b86be",
    "wheels/tokenizers-0.23.2-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "41c2f84d172449b4dadb9cdc508e3e364076613c35b16e76ecfe47a60d1e3305",
    "wheels/torch-2.8.0-cp312-cp312-manylinux_2_28_x86_64.whl": "b2aca0939fb7e4d842561febbd4ffda67a8e958ff725c1c27e244e85e982173c",
    "wheels/tqdm-4.70.1-py3-none-any.whl": "c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73",
    "wheels/transformers-5.17.0-py3-none-any.whl": "78ec1ce21579b38dfb83950a0658cd119f87212a2fcfdff478096ce9d6c03801",
    "wheels/triton-3.4.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "31c1d84a5c0ec2c0f8e8a072d7fd150cab84a9c239eaddc6706c081bfae4eb04",
    "wheels/truststore-0.10.4-py3-none-any.whl": "adaeaecf1cbb5f4de3b1959b42d41f6fab57b2b1666adb59e89cb0b53361d981",
    "wheels/typer-0.27.2-py3-none-any.whl": "b3a5fc4342d5fc8fda8fc3010b1cf117e9249aab7fae800c2eff62fd3842d97d",
    "wheels/typesafe_sdk-0.6.0-py3-none-any.whl": "21559d5558e95a7ee008d0a044a60bb5bb2d3b1ec426fe158a7f37af35ba3232",
    "wheels/typing_extensions-4.16.0-py3-none-any.whl": "481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8",
    "wheels/typing_inspection-0.4.4-py3-none-any.whl": "65b8397ba37ccbce054456aaccddfc91e6e3083c92824df348d96ca832f3f147",
    "wheels/tzdata-2026.4-py2.py3-none-any.whl": "c2169a8b0a7a5e9674da5a135ccdfb2b3e671b333ed9fed17b41f73c34476e81",
    "wheels/urllib3-2.8.0-py3-none-any.whl": "0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3",
    "wheels/uvicorn-0.53.0-py3-none-any.whl": "e8dca71ec86dce5f04e333f0d56cdedf942446e6643b9cea1af0d6d3a02cb03e",
    "wheels/xxhash-4.0.1-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "237b8f63a2a0fcfb1ffc06e21dad23add44e6d354b2b014364a1d41e419a4dee"
}
MEMBER_LIMIT = 1073741824
CONTEXT_LIMIT = 6442450944
REMOTE_ROOT = '/runtime-supplement/krino'
BUILD_TIMEOUT_S = 5400

def _sha256_stream(stream):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    return digest.hexdigest()


def sha256(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError('supplement file is not a regular file')
    with path.open('rb') as stream:
        return _sha256_stream(stream)

def active(job, recipe):
    """Only this order's reviewed http_typesafe recipe on the exact pinned base selects the supplement."""
    return (Path(job).name == ORDER and isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
            and recipe.get('image') == BASE_IMAGE)

def check_context(context=CONTEXT):
    """The context must be byte-identical to the pinned public-only inventory."""
    context = Path(context)
    if context.is_symlink() or not context.is_file() or context.stat().st_size > CONTEXT_LIMIT \
            or sha256(context) != CONTEXT_SHA:
        raise ValueError('supplement context pin')
    with tarfile.open(context, 'r:') as archive:
        members = archive.getmembers()
        if len(members) != len(FILES) or {m.name for m in members} != set(FILES) \
                or any(not m.isfile() or m.size > MEMBER_LIMIT for m in members):
            raise ValueError('supplement context inventory')
        for member in members:
            with archive.extractfile(member) as content:
                if _sha256_stream(content) != FILES[member.name]:
                    raise ValueError('supplement member pin')


def binding():
    return {'module_sha256': sha256(__file__), 'context_sha256': CONTEXT_SHA, 'base_image': BASE_IMAGE}


def build(provider, pod_id, context=CONTEXT):
    """Build the derived image on the owned pod; returns its evidence record.

    A host-side pin problem is an operational hold (no retry); a pod-side failure raises PodRunError via
    pod_runner._exec and is eligible for the ordinary single fresh-pod retry."""
    try:
        check_context(context)
        evidence = binding()
    except (OSError, ValueError, tarfile.TarError):
        raise measurement_dispatch.OperationalHold('runtime_supplement_unaccepted') from None
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', REMOTE_ROOT])
    provider.scp_to(pod_id, str(context), REMOTE_ROOT + '/context.tar')
    transferred = pod_runner._exec(provider, pod_id, ['sha256sum', REMOTE_ROOT + '/context.tar'])
    if CONTEXT_SHA not in transferred.stdout.split():
        raise pod_runner.PodRunError('runtime supplement context changed in transfer')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', REMOTE_ROOT + '/context.tar', '-C', REMOTE_ROOT])
    pod_runner._exec(provider, pod_id, ['docker', 'build', '--network', 'none', '--pull=false',
                                        '--iidfile', REMOTE_ROOT + '/image.iid',
                                        '-f', REMOTE_ROOT + '/Dockerfile.runtime-supplement', REMOTE_ROOT],
                     timeout=BUILD_TIMEOUT_S)
    image = pod_runner._exec(provider, pod_id, ['cat', REMOTE_ROOT + '/image.iid']).stdout.strip()
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise pod_runner.PodRunError('runtime supplement build has no immutable image id')
    inspected = pod_runner._exec(provider, pod_id, ['docker', 'image', 'inspect', image, '--format', '{{.Id}}'])
    if inspected.stdout.strip() != image:
        raise pod_runner.PodRunError('runtime supplement image identity differs')
    return dict(evidence, effective_image=image)
