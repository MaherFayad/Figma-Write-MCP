#!/usr/bin/env node
/**
 * Font Loader Helper
 * 
 * Generates font loading code from design context.
 * 
 * Usage: Pass font list from get_design_context
 */

function generateFontLoadCode(fonts) {
    const loadStatements = fonts.map(font =>
        `await figma.loadFontAsync({ family: "${font.family}", style: "${font.style}" });`
    );

    return loadStatements.join('\n');
}

// Example output:
// await figma.loadFontAsync({ family: "Inter", style: "Regular" });
// await figma.loadFontAsync({ family: "Inter", style: "Medium" });
// await figma.loadFontAsync({ family: "Inter", style: "Bold" });

module.exports = { generateFontLoadCode };
