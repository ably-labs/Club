set -e
BASEDIR=$(dirname "$0")
OUTPUT_DIR="$BASEDIR/../web/public/ts/flatbuffers"
FBS_DIR="$BASEDIR/../models/flatbuffers"
flatc --ts -o "$OUTPUT_DIR" "$FBS_DIR/UserState.fbs"