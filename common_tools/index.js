const fs = require('fs');
const path = require('path');
const findMissing = require('./find_missing_bits_to_translate.js');
const inventory = require('./make_inventory.js');
const { json_to_po, po_to_json } = require('./converter.js');
const jsonConcat = require("json-concat")



const COMMANDS = {
    missing,
    match,
    add_restored,
    convert,
    concatenate_json
};
const args = process.argv.slice(2);
const command = args.shift();

if (COMMANDS[command]) {
    COMMANDS[command](args);
} else {
    console.log(`Command not recognised, command=${command}`);
}

function missing([inputFile_current_list, inputFile_translation_dict, outputDir]) {
    const curr_list = readInputFile(inputFile_current_list);
    const curr_transl = readInputFile(inputFile_translation_dict);
    
    const missing_bits = findMissing.findMissing(curr_list,curr_transl);
    const word_count = findMissing.countMissing(missing_bits);
    console.log("missing words to translate: " + word_count)
    writeOutputFile(outputDir, 'missing_bits_to_translate.json', missing_bits);
}

function match([inputFile_missing_bits, inputFile_translation_dict, outputDir]) {
    const missing_bits = readInputFile(inputFile_missing_bits);
    const curr_transl = readInputFile(inputFile_translation_dict);
    
    const best_matches = inventory.findBestMatch(missing_bits,curr_transl)
    writeOutputFile(outputDir, 'best_matches.json', best_matches);
}

function add_restored([inputFile_selected_best_matches, inputFile_translation_dict, outputDir]) {
    // ????if inputFile_translation_dict is not specified it should be the empty list?????
    const selected_best_matches = readInputFile(inputFile_selected_best_matches);
    const curr_transl = readInputFile(inputFile_translation_dict);
    
    const updated_transl_dict = inventory.addRestoredToTranslationDictionary(selected_best_matches,curr_transl)
    writeOutputFile(outputDir, 'update_transl_dict.json', updated_transl_dict);
}

function convert([input_file_path, output_file_path]) {
    const convertFn = path.extname(input_file_path) === '.json' ? json_to_po : po_to_json;
    const options = {
        isTemplate: output_file_path && path.extname(output_file_path) === '.pot'
    };
    const input_file = fs.readFileSync(input_file_path);
    let output = convertFn(input_file, options);

    if (output_file_path) {
        fs.writeFile(output_file_path, output, outputFileErrorHandler);
    } else {
        console.log(output);
    }
}

function concatenate_json([file_containing_json, destination_file, file_name]) {
    // an array of filenames to concat
    const files = [];

    filenames = fs.readdirSync(file_containing_json)
    filenames.forEach((file) => {
        files.push(path.join(file_containing_json,file));
    })

    // pass the "files" to json concat    
    jsonConcat({
        src: files,
        dest: destination_file+"/"+file_name+".json"
    }, function (json){
        console.log(json);
    })
}

function readInputFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath).toString());
}

function writeOutputFile(outputDir, filename, data) {
    const outputFile = path.join(outputDir, filename);
    const json = JSON.stringify(data, null, 2);
    fs.writeFile(
        outputFile,
        json,
        outputFileErrorHandler
    );
}

function outputFileErrorHandler(err) {
    if (err)  {
        console.log('error', err);
    }
}
