// USD per million tokens. Versioned configuration, not live provider billing.
// Unknown models fail closed; review these rates before enabling a new model.
export const aiPricing:Record<string,{input:number;output:number;imageInput?:number}>={
 "gpt-4.1-mini":{input:0.4,output:1.6},
 "gpt-5.4":{input:2.5,output:15},
 // GPT Image 2: Standard (not Batch), see docs/image-model-migration.md.
 "gpt-image-2":{input:5,imageInput:8,output:30},
 "gpt-image-1":{input:5,imageInput:10,output:40},
 "omni-moderation-latest":{input:0,output:0},
};
