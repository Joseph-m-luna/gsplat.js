import { Vector3 } from "../math/Vector3";
import { Quaternion } from "../math/Quaternion";
import { Matrix3 } from "../math/Matrix3";

class SplatData {
    static RowLength = 3 * 4 + 3 * 4 + 4 + 4;

    public changed = false;
    public detached = false;

    private _vertexCount: number;
    private _positions: Float32Array;
    private _rotations: Float32Array;
    private _scales: Float32Array;
    private _colors: Uint8Array;
    private _selection: Uint8Array;
    //private _embeddings: Float32Array;
    private _car_similarities: Float32Array;
    private _house_similarities: Float32Array;
    private _tree_similarities: Float32Array;
    private _grass_similarities: Float32Array;
    private _road_similarities: Float32Array;
    private _lamp_similarities: Float32Array;

    private _rgb: Uint8Array;

    translate: (translation: Vector3) => void;
    rotate: (rotation: Quaternion) => void;
    scale: (scale: Vector3) => void;
    serialize: () => Uint8Array;
    procLangsplat: (type: string) => void;
    mapHeatValue: (val: number, valMin: number, valMax: number, colorMin: number, colorMax: number) => number[];
    reattach: (
        positions: ArrayBufferLike,
        rotations: ArrayBufferLike,
        scales: ArrayBufferLike,
        colors: ArrayBufferLike,
        selection: ArrayBufferLike,
    ) => void;
    printAverage: (arr: Float32Array) => void;

    constructor(
        vertexCount: number = 0,
        positions: Float32Array | null = null,
        rotations: Float32Array | null = null,
        scales: Float32Array | null = null,
        colors: Uint8Array | null = null,
        //embeddings: Float32Array | null = null,
        car_similarities: Float32Array | null = null,
        house_similarities: Float32Array | null = null,
        tree_similarities: Float32Array | null = null,
        grass_similarities: Float32Array | null = null,
        road_similarities: Float32Array | null = null,
        lamp_similarities: Float32Array | null = null,
    ) {
        this._vertexCount = vertexCount;
        this._positions = positions || new Float32Array(0);
        this._rotations = rotations || new Float32Array(0);
        this._scales = scales || new Float32Array(0);
        this._colors = colors || new Uint8Array(0);
        this._selection = new Uint8Array(this.vertexCount);
        //this._embeddings = embeddings || new Float32Array(0);
        this._car_similarities = car_similarities || new Float32Array(0);
        this._house_similarities = house_similarities || new Float32Array(0);
        this._tree_similarities = tree_similarities || new Float32Array(0);
        this._grass_similarities = grass_similarities || new Float32Array(0);
        this._road_similarities = road_similarities || new Float32Array(0);
        this._lamp_similarities = lamp_similarities || new Float32Array(0);

        this._rgb = colors || new Uint8Array(0)

        this.translate = (translation: Vector3) => {
            for (let i = 0; i < this.vertexCount; i++) {
                this.positions[3 * i + 0] += translation.x;
                this.positions[3 * i + 1] += translation.y;
                this.positions[3 * i + 2] += translation.z;
            }

            this.changed = true;
        };

        this.rotate = (rotation: Quaternion) => {
            const R = Matrix3.RotationFromQuaternion(rotation).buffer;
            for (let i = 0; i < this.vertexCount; i++) {
                const x = this.positions[3 * i + 0];
                const y = this.positions[3 * i + 1];
                const z = this.positions[3 * i + 2];

                this.positions[3 * i + 0] = R[0] * x + R[1] * y + R[2] * z;
                this.positions[3 * i + 1] = R[3] * x + R[4] * y + R[5] * z;
                this.positions[3 * i + 2] = R[6] * x + R[7] * y + R[8] * z;

                const currentRotation = new Quaternion(
                    this.rotations[4 * i + 1],
                    this.rotations[4 * i + 2],
                    this.rotations[4 * i + 3],
                    this.rotations[4 * i + 0],
                );

                const newRot = rotation.multiply(currentRotation);
                this.rotations[4 * i + 1] = newRot.x;
                this.rotations[4 * i + 2] = newRot.y;
                this.rotations[4 * i + 3] = newRot.z;
                this.rotations[4 * i + 0] = newRot.w;
            }

            this.changed = true;
        };

        this.scale = (scale: Vector3) => {
            for (let i = 0; i < this.vertexCount; i++) {
                this.positions[3 * i + 0] *= scale.x;
                this.positions[3 * i + 1] *= scale.y;
                this.positions[3 * i + 2] *= scale.z;

                this.scales[3 * i + 0] *= scale.x;
                this.scales[3 * i + 1] *= scale.y;
                this.scales[3 * i + 2] *= scale.z;
            }

            this.changed = true;
        };

        this.serialize = () => {//add to this for unpacking .langsplat files
            const data = new Uint8Array(this.vertexCount * SplatData.RowLength);

            const f_buffer = new Float32Array(data.buffer);
            const u_buffer = new Uint8Array(data.buffer);

            for (let i = 0; i < this.vertexCount; i++) {
                f_buffer[8 * i + 0] = this.positions[3 * i + 0];
                f_buffer[8 * i + 1] = this.positions[3 * i + 1];
                f_buffer[8 * i + 2] = this.positions[3 * i + 2];

                u_buffer[32 * i + 24 + 0] = this.colors[4 * i + 0];
                u_buffer[32 * i + 24 + 1] = this.colors[4 * i + 1];
                u_buffer[32 * i + 24 + 2] = this.colors[4 * i + 2];
                u_buffer[32 * i + 24 + 3] = this.colors[4 * i + 3];

                f_buffer[8 * i + 3 + 0] = this.scales[3 * i + 0];
                f_buffer[8 * i + 3 + 1] = this.scales[3 * i + 1];
                f_buffer[8 * i + 3 + 2] = this.scales[3 * i + 2];

                u_buffer[32 * i + 28 + 0] = (this.rotations[4 * i + 0] * 128 + 128) & 0xff;
                u_buffer[32 * i + 28 + 1] = (this.rotations[4 * i + 1] * 128 + 128) & 0xff;
                u_buffer[32 * i + 28 + 2] = (this.rotations[4 * i + 2] * 128 + 128) & 0xff;
                u_buffer[32 * i + 28 + 3] = (this.rotations[4 * i + 3] * 128 + 128) & 0xff;
            }

            return data;
        };

        this.reattach = (
            positions: ArrayBufferLike,
            rotations: ArrayBufferLike,
            scales: ArrayBufferLike,
            colors: ArrayBufferLike,
            selection: ArrayBufferLike,
        ) => {
            console.assert(
                positions.byteLength === this.vertexCount * 3 * 4,
                `Expected ${this.vertexCount * 3 * 4} bytes, got ${positions.byteLength} bytes`,
            );
            this._positions = new Float32Array(positions);
            this._rotations = new Float32Array(rotations);
            this._scales = new Float32Array(scales);
            this._colors = new Uint8Array(colors);
            this._selection = new Uint8Array(selection);
            this.detached = false;
        };

        this.mapHeatValue = (
            val, 
            valMin, 
            valMax, 
            coloxMin, 
            colorMax
        ) => {
            val = ((val - valMin) / (valMax -valMin))
            
            //red color calculations
            const red = 255
            const green = 0
            const blue = 0
            return [red, green, blue]
        }

        this.printAverage = (arr: Float32Array) => {
            let sum = 0;
            for (let i = 0; i < arr.length; i++) {
                sum += arr[i];
            }
            const average = sum / arr.length;
            console.log(`Average: ${average}`);
        }

        this.procLangsplat = (type: string) => {
            //console.log(this._similarities.reduce((min, current) => current < min ? current : min, this._similarities[0]));
            //console.log(this._similarities.reduce((max, current) => current > max ? current : max, this._similarities[0]))
            
        
            //this.printAverage(this._similarities)

            //console.log("lengths")
            
            //console.log(this._similarities.length)
            //console.log(this._colors.length)

            let similarities = this._car_similarities

            switch (type) {
                case "car":
                    similarities = this._car_similarities
                    break;
                case "house":
                    similarities = this._house_similarities
                    break;
                case "tree":
                    similarities = this._tree_similarities
                    break;
                case "grass":
                    similarities = this._grass_similarities
                    break;
                case "road":
                    similarities = this._road_similarities
                    break;
                case "lamp":
                    similarities = this._lamp_similarities
                    break;
                default:
                    similarities = this._car_similarities
                    break;
            }

            for (let j = 0; j < similarities.length ; j++) {
                if (similarities[j] > 0.25) {
                    const splatRGB = this.mapHeatValue(similarities[j], 0, 0, 0, 0);
                    this._colors[4 * j + 0] = splatRGB[0];
                    this._colors[4 * j + 1] = splatRGB[1];
                    this._colors[4 * j + 2] = splatRGB[2];
                 } else {
                    this._colors[4 *j + 0] = this._rgb[4 *j + 0];
                    this._colors[4 *j + 0] = this._rgb[4 *j + 0];
                    this._colors[4 *j + 0] = this._rgb[4 *j + 0];
                    this._colors[4 *j + 0] = this._rgb[4 *j + 0];
                }
            }
        };
    }

    static Deserialize(data: Uint8Array): SplatData {
        const num_lang_embeds = 6;

        const vertexCount = data.length / SplatData.RowLength;
        const positions = new Float32Array(3 * vertexCount);
        const rotations = new Float32Array(4 * vertexCount);
        const scales = new Float32Array(3 * vertexCount);
        const colors = new Uint8Array(4 * vertexCount);
        //const embeddings = new Float32Array(num_lang_embeds * vertexCount)

        const f_buffer = new Float32Array(data.buffer);
        const u_buffer = new Uint8Array(data.buffer);

        for (let i = 0; i < vertexCount; i++) {
            positions[3 * i + 0] = f_buffer[8 * i + 0]; //first
            positions[3 * i + 1] = f_buffer[8 * i + 1];
            positions[3 * i + 2] = f_buffer[8 * i + 2];

            rotations[4 * i + 0] = (u_buffer[32 * i + 28 + 0] - 128) / 128; //fourth
            rotations[4 * i + 1] = (u_buffer[32 * i + 28 + 1] - 128) / 128;
            rotations[4 * i + 2] = (u_buffer[32 * i + 28 + 2] - 128) / 128;
            rotations[4 * i + 3] = (u_buffer[32 * i + 28 + 3] - 128) / 128;

            scales[3 * i + 0] = f_buffer[8 * i + 3 + 0]; //second
            scales[3 * i + 1] = f_buffer[8 * i + 3 + 1];
            scales[3 * i + 2] = f_buffer[8 * i + 3 + 2];

            colors[4 * i + 0] = u_buffer[32 * i + 24 + 0]; //third
            colors[4 * i + 1] = u_buffer[32 * i + 24 + 1];
            colors[4 * i + 2] = u_buffer[32 * i + 24 + 2];
            colors[4 * i + 3] = u_buffer[32 * i + 24 + 3];

            // for (let j = 0; j < num_lang_embeds; j++) {
            //     embeddings[num_lang_embeds * i + j] = f_buffer[32 * i + 32 + j]
            // }
        }

        return new SplatData(vertexCount, positions, rotations, scales, colors);
    }

    static DeserializeLangsplat(data: Uint8Array): SplatData {
        const num_lang_embeds = 1;
        const num_lang_feat = 6;

        const vertexCount = data.length / (SplatData.RowLength + 4 * (1 * num_lang_feat));
        const positions = new Float32Array(3 * vertexCount);
        const rotations = new Float32Array(4 * vertexCount);
        const scales = new Float32Array(3 * vertexCount);
        const colors = new Uint8Array(4 * vertexCount);
        //const embeddings = new Float32Array(num_lang_embeds * vertexCount)
        const car_similarities = new Float32Array(1 * vertexCount)
        const house_similarities = new Float32Array(1 * vertexCount)
        const tree_similarities = new Float32Array(1 * vertexCount)
        const grass_similarities = new Float32Array(1 * vertexCount)
        const road_similarities = new Float32Array(1 * vertexCount)
        const lamp_similarities = new Float32Array(1 * vertexCount)

        const f_buffer = new Float32Array(data.buffer);
        const u_buffer = new Uint8Array(data.buffer);

        for (let i = 0; i < vertexCount; i++) {
            positions[3 * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 0]; //first
            positions[3 * i + 1] = f_buffer[(8 + (1 * num_lang_feat)) * i + 1];
            positions[3 * i + 2] = f_buffer[(8 + (1 * num_lang_feat)) * i + 2];

            rotations[4 * i + 0] = (u_buffer[(32 + (4 * num_lang_feat)) * i + 28 + 0] - 128) / 128; //fourth
            rotations[4 * i + 1] = (u_buffer[(32 + (4 * num_lang_feat)) * i + 28 + 1] - 128) / 128;
            rotations[4 * i + 2] = (u_buffer[(32 + (4 * num_lang_feat)) * i + 28 + 2] - 128) / 128;
            rotations[4 * i + 3] = (u_buffer[(32 + (4 * num_lang_feat)) * i + 28 + 3] - 128) / 128;

            scales[3 * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 3 + 0]; //second
            scales[3 * i + 1] = f_buffer[(8 + (1 * num_lang_feat)) * i + 3 + 1];
            scales[3 * i + 2] = f_buffer[(8 + (1 * num_lang_feat)) * i + 3 + 2];

            colors[4 * i + 0] = u_buffer[(32 + (4 * num_lang_feat)) * i + 24 + 0]; //third
            colors[4 * i + 1] = u_buffer[(32 + (4 * num_lang_feat)) * i + 24 + 1];
            colors[4 * i + 2] = u_buffer[(32 + (4 * num_lang_feat)) * i + 24 + 2];
            colors[4 * i + 3] = u_buffer[(32 + (4 * num_lang_feat)) * i + 24 + 3];

            car_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 8] //fifth
            house_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 9]
            tree_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 10]
            grass_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 11]
            road_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 12]
            lamp_similarities[num_lang_embeds * i + 0] = f_buffer[(8 + (1 * num_lang_feat)) * i + 13]
        }

        return new SplatData(vertexCount, positions, rotations, scales, colors, car_similarities, house_similarities, tree_similarities, grass_similarities, road_similarities, lamp_similarities);
    }

    get vertexCount() {
        return this._vertexCount;
    }

    get positions() {
        return this._positions;
    }

    get rotations() {
        return this._rotations;
    }

    get scales() {
        return this._scales;
    }

    get colors() {
        return this._colors;
    }

    get selection() {
        return this._selection;
    }

    clone() {
        return new SplatData(
            this.vertexCount,
            new Float32Array(this.positions),
            new Float32Array(this.rotations),
            new Float32Array(this.scales),
            new Uint8Array(this.colors),
        );
    }
}

export { SplatData };
