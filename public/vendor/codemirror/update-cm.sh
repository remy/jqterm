VERSION=5.39.2

ROOT=$(pwd)/$VERSION

mkdir -p $VERSION
mkdir -p $VERSION/mode/javascript
mkdir -p $VERSION/addon/{edit,scroll,mode,fold}

cd $ROOT
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/codemirror.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/codemirror.css

cd $ROOT ; cd mode/javascript
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/mode/javascript/javascript.min.js

cd $ROOT ; cd addon/mode
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/mode/simple.min.js

cd $ROOT; cd addon/edit
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/edit/closebrackets.min.js

cd $ROOT; cd addon/scroll
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/scroll/scrollpastend.min.js

cd $ROOT; cd addon/fold
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/fold/foldcode.js
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/fold/foldgutter.js
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/fold/brace-fold.js
wget https://cdnjs.cloudflare.com/ajax/libs/codemirror/$VERSION/addon/fold/foldgutter.css

cd $ROOT/..
