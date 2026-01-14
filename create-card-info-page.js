// Card Info Page Creation Script
// Run this in Figma Plugin Console or as a plugin

(async () => {
  try {
    const page = figma.currentPage;
    
    // Get local styles to maintain consistency
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    
    // Find existing styles or use defaults
    const findPaintStyle = (name) => paintStyles.find(s => s.name.includes(name));
    const findTextStyle = (name) => textStyles.find(s => s.name.includes(name));
    
    // Create main card info page frame (375px width like other pages)
    const cardInfoFrame = figma.createFrame();
    cardInfoFrame.name = "Card Info Page";
    cardInfoFrame.resize(375, 900);
    cardInfoFrame.x = 1300;
    cardInfoFrame.y = 328;
    
    // Set background - try to use existing style or default white
    const bgStyle = findPaintStyle("Background") || findPaintStyle("White");
    if (bgStyle) {
      cardInfoFrame.fillStyleId = bgStyle.id;
    } else {
      cardInfoFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    }
    
    // Create header section (matching existing header pattern: 375x147)
    const headerFrame = figma.createFrame();
    headerFrame.name = "Header";
    headerFrame.resize(375, 147);
    headerFrame.x = 0;
    headerFrame.y = 0;
    headerFrame.fills = cardInfoFrame.fills;
    
    // Status bar area (optional, matching pattern)
    const statusBar = figma.createFrame();
    statusBar.name = "Status Bar";
    statusBar.resize(359, 19);
    statusBar.x = 8;
    statusBar.y = 12;
    statusBar.fills = [];
    headerFrame.appendChild(statusBar);
    
    // Header container with back button (matching pattern: 359x28 at y:63)
    const headerContainer = figma.createFrame();
    headerContainer.name = "Header Container";
    headerContainer.resize(359, 28);
    headerContainer.x = 8;
    headerContainer.y = 63;
    headerContainer.fills = [];
    headerContainer.layoutMode = "HORIZONTAL";
    headerContainer.paddingLeft = 0;
    headerContainer.paddingRight = 0;
    headerContainer.itemSpacing = 16;
    
    // Back button text
    const defaultFont = { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(defaultFont);
    
    const backText = figma.createText();
    backText.characters = "Back";
    backText.fontSize = 16;
    backText.x = 32;
    backText.y = 0;
    
    // Try to use existing text style
    const headerTextStyle = findTextStyle("Header") || findTextStyle("Body");
    if (headerTextStyle) {
      backText.textStyleId = headerTextStyle.id;
    } else {
      backText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    }
    
    headerContainer.appendChild(backText);
    headerFrame.appendChild(headerContainer);
    
    // Progress bar (matching pattern: 359x4 at y:123)
    const progressBar = figma.createFrame();
    progressBar.name = "Progress Bar";
    progressBar.resize(359, 4);
    progressBar.x = 8;
    progressBar.y = 123;
    progressBar.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    headerFrame.appendChild(progressBar);
    
    // Create main content area (343px width, matching pattern)
    const contentFrame = figma.createFrame();
    contentFrame.name = "Content";
    contentFrame.resize(343, 600);
    contentFrame.x = 16;
    contentFrame.y = 187;
    contentFrame.fills = [];
    contentFrame.layoutMode = "VERTICAL";
    contentFrame.paddingTop = 0;
    contentFrame.paddingBottom = 0;
    contentFrame.paddingLeft = 0;
    contentFrame.paddingRight = 0;
    contentFrame.itemSpacing = 16;
    
    // Create card info card (matching Attribution card pattern: 335x183 with 16px padding)
    const cardInfoCard = figma.createFrame();
    cardInfoCard.name = "Card Info Card";
    cardInfoCard.resize(343, 280);
    cardInfoCard.layoutMode = "VERTICAL";
    cardInfoCard.paddingTop = 16;
    cardInfoCard.paddingBottom = 16;
    cardInfoCard.paddingLeft = 16;
    cardInfoCard.paddingRight = 16;
    cardInfoCard.itemSpacing = 16;
    
    // Use existing card style or create default
    const cardStyle = findPaintStyle("Card") || findPaintStyle("Surface");
    if (cardStyle) {
      cardInfoCard.fillStyleId = cardStyle.id;
    } else {
      cardInfoCard.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    }
    cardInfoCard.cornerRadius = 8;
    
    // Card title section
    const titleFrame = figma.createFrame();
    titleFrame.name = "Title Section";
    titleFrame.resize(311, 36);
    titleFrame.fills = [];
    
    const cardTitle = figma.createText();
    cardTitle.characters = "Card Information";
    const titleStyle = findTextStyle("Heading") || findTextStyle("Title");
    if (titleStyle) {
      cardTitle.textStyleId = titleStyle.id;
    } else {
      cardTitle.fontSize = 20;
      cardTitle.fontWeight = 600;
      cardTitle.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    titleFrame.appendChild(cardTitle);
    cardInfoCard.appendChild(titleFrame);
    
    // Card number field
    const cardNumberFrame = figma.createFrame();
    cardNumberFrame.name = "Card Number Field";
    cardNumberFrame.resize(311, 48);
    cardNumberFrame.fills = [];
    cardNumberFrame.layoutMode = "VERTICAL";
    cardNumberFrame.itemSpacing = 4;
    
    const cardNumberLabel = figma.createText();
    cardNumberLabel.characters = "Card Number";
    const labelStyle = findTextStyle("Label") || findTextStyle("Caption");
    if (labelStyle) {
      cardNumberLabel.textStyleId = labelStyle.id;
    } else {
      cardNumberLabel.fontSize = 14;
      cardNumberLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    const cardNumberValue = figma.createText();
    cardNumberValue.characters = "**** **** **** 1234";
    const valueStyle = findTextStyle("Body") || findTextStyle("Regular");
    if (valueStyle) {
      cardNumberValue.textStyleId = valueStyle.id;
    } else {
      cardNumberValue.fontSize = 16;
      cardNumberValue.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    
    cardNumberFrame.appendChild(cardNumberLabel);
    cardNumberFrame.appendChild(cardNumberValue);
    cardInfoCard.appendChild(cardNumberFrame);
    
    // Expiry date field
    const expiryFrame = figma.createFrame();
    expiryFrame.name = "Expiry Field";
    expiryFrame.resize(311, 48);
    expiryFrame.fills = [];
    expiryFrame.layoutMode = "VERTICAL";
    expiryFrame.itemSpacing = 4;
    
    const expiryLabel = figma.createText();
    expiryLabel.characters = "Expiry Date";
    if (labelStyle) {
      expiryLabel.textStyleId = labelStyle.id;
    } else {
      expiryLabel.fontSize = 14;
      expiryLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    const expiryValue = figma.createText();
    expiryValue.characters = "12/25";
    if (valueStyle) {
      expiryValue.textStyleId = valueStyle.id;
    } else {
      expiryValue.fontSize = 16;
      expiryValue.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    
    expiryFrame.appendChild(expiryLabel);
    expiryFrame.appendChild(expiryValue);
    cardInfoCard.appendChild(expiryFrame);
    
    // Cardholder name field
    const nameFrame = figma.createFrame();
    nameFrame.name = "Name Field";
    nameFrame.resize(311, 48);
    nameFrame.fills = [];
    nameFrame.layoutMode = "VERTICAL";
    nameFrame.itemSpacing = 4;
    
    const nameLabel = figma.createText();
    nameLabel.characters = "Cardholder Name";
    if (labelStyle) {
      nameLabel.textStyleId = labelStyle.id;
    } else {
      nameLabel.fontSize = 14;
      nameLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    const nameValue = figma.createText();
    nameValue.characters = "John Doe";
    if (valueStyle) {
      nameValue.textStyleId = valueStyle.id;
    } else {
      nameValue.fontSize = 16;
      nameValue.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    
    nameFrame.appendChild(nameLabel);
    nameFrame.appendChild(nameValue);
    cardInfoCard.appendChild(nameFrame);
    
    contentFrame.appendChild(cardInfoCard);
    
    // Add footer actions (matching pattern)
    const footerFrame = figma.createFrame();
    footerFrame.name = "Footer actions";
    footerFrame.resize(343, 48);
    footerFrame.x = 0;
    footerFrame.y = 724;
    footerFrame.fills = [];
    
    cardInfoFrame.appendChild(headerFrame);
    cardInfoFrame.appendChild(contentFrame);
    cardInfoFrame.appendChild(footerFrame);
    
    page.appendChild(cardInfoFrame);
    
    // Select the new frame
    figma.currentPage.selection = [cardInfoFrame];
    figma.viewport.scrollAndZoomIntoView([cardInfoFrame]);
    
    figma.notify("Card info page created successfully!");
    
    return {
      success: true,
      frameId: cardInfoFrame.id
    };
  } catch (error) {
    figma.notify("Error: " + error.message);
    return {
      success: false,
      error: error.message
    };
  }
})();
