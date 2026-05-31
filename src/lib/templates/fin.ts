import type { WorkflowTemplate } from "./types";

export const FIN_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "FIN_GROOTBOEK",
    name: "Memoriaalboeking verwerken",
    category: "FIN",
    description: "Test het aanmaken, controleren en definitief boeken van een handmatige journaalpost via het memoriaal dagboek in AFAS Profit Financieel.",
    steps: [
      {
        title: "Memoriaal dagboek openen",
        instruction: "Ga naar Financieel > Boeken > Memoriaal en selecteer het juiste memoriaal dagboek en de gewenste boekingsperiode.",
        expectedResult: "Het invoerscherm voor een nieuwe journaalpost wordt geopend met het geselecteerde dagboek en de boekingsperiode zichtbaar.",
      },
      {
        title: "Journaalpost invoeren",
        instruction: "Voer een nieuwe journaalpost in met minimaal twee boekingsregels: een debetboeking op een kostenrekening en een creditboeking op een tussenrekening, beide met het correcte boekingsbedrag.",
        expectedResult: "Profit toont het debetbedrag en creditbedrag als gelijk; het saldo van de journaalpost is nul en de post kan worden opgeslagen.",
      },
      {
        title: "Grootboekkaart raadplegen",
        instruction: "Ga naar Financieel > Grootboek > Grootboekkaart en zoek op de gebruikte grootboekrekening om de zojuist ingevoerde boeking te controleren.",
        expectedResult: "De journaalpost is zichtbaar op de grootboekkaart met de juiste boekingsdatum, het bedrag en het dagboeknummer.",
      },
      {
        title: "Journaalpost definitief boeken",
        instruction: "Keer terug naar Financieel > Boeken > Memoriaal, selecteer de concept-journaalpost en kies de actie 'Boeken' om de post definitief te verwerken.",
        expectedResult: "De journaalpost krijgt de status 'Geboekt' en is niet meer bewerkbaar; Profit heeft een uniek journaalnummer toegewezen.",
      },
      {
        title: "Proefbalans controleren",
        instruction: "Ga naar Financieel > Rapportages > Proefbalans en genereer een proefbalans voor de betreffende periode om de verwerking te verifiëren.",
        expectedResult: "De proefbalans toont de geboekte journaalpost op de juiste grootboekrekeningen; de debet- en credittotalen zijn in evenwicht.",
      },
    ],
  },
  {
    key: "FIN_DEBCRED",
    name: "Openstaande posten debiteuren en crediteuren bewaken",
    category: "FIN",
    description: "Test het raadplegen, bewaken en afstemmen van openstaande posten voor debiteuren en crediteuren in AFAS Profit Financieel.",
    steps: [
      {
        title: "Openstaande posten debiteuren raadplegen",
        instruction: "Ga naar Financieel > Debiteuren > Openstaande posten en selecteer een debiteur om het overzicht van alle onbetaalde verkoopfacturen te bekijken.",
        expectedResult: "Profit toont een lijst van openstaande posten met factuurnummer, factuurdatum, vervaldatum en het openstaande bedrag per debiteur.",
      },
      {
        title: "Debiteurenbewaking uitvoeren",
        instruction: "Ga naar Financieel > Debiteuren > Debiteurenbewaking en filter op debiteuren met een vervaldatum ouder dan 30 dagen om achterstallige vorderingen te identificeren.",
        expectedResult: "Het overzicht toont alle debiteuren met achterstallige vorderingen inclusief het aantal vervallen dagen en het totale achterstallige bedrag.",
      },
      {
        title: "Openstaande posten crediteuren controleren",
        instruction: "Ga naar Financieel > Crediteuren > Openstaande posten en selecteer een crediteur om het overzicht van te betalen inkoopfacturen te raadplegen.",
        expectedResult: "Profit toont alle openstaande crediteurfacturen met inkoopfactuurnummer, boekingsdatum, vervaldatum en het te betalen bedrag.",
      },
      {
        title: "Crediteurenbewaking raadplegen",
        instruction: "Ga naar Financieel > Crediteuren > Crediteurenbewaking en bekijk het overzicht van crediteuren met een naderend vervaldatum.",
        expectedResult: "De crediteurenbewaking toont een gesorteerd overzicht op vervaldatum; facturen die binnenkort vervallen zijn duidelijk herkenbaar in het scherm.",
      },
      {
        title: "Afstemming subadministratie en grootboek",
        instruction: "Ga naar Financieel > Rapportages > Controlelijst openstaande posten en vergelijk de saldi van debiteuren en crediteuren met de bijbehorende grootboekrekeningen.",
        expectedResult: "Het saldo van de subadministratie debiteuren respectievelijk crediteuren sluit aan op de corresponderende balansrekeningen in het grootboek.",
      },
    ],
  },
  {
    key: "FIN_FACTURATIE",
    name: "Verkoopfactuur aanmaken en doorboeken",
    category: "FIN",
    description: "Test het aanmaken, controleren en financieel doorboeken van een verkoopfactuur in AFAS Profit via Ordermanagement en Financieel.",
    steps: [
      {
        title: "Verkoopfactuur aanmaken",
        instruction: "Ga naar Ordermanagement > Verkoopproces > Verkoopfactuur en klik op 'Nieuw' om handmatig een verkoopfactuur aan te maken voor een bestaande debiteur.",
        expectedResult: "Het invoerscherm voor een nieuwe verkoopfactuur opent met de debiteurnaam, het factuuradres en een leeg regelgedeelte voor artikelen of diensten.",
      },
      {
        title: "Factuurregels invoeren en BTW controleren",
        instruction: "Voeg minimaal een factuurregel toe met een artikel of omschrijving, aantal, eenheidsprijs en het juiste BTW-tarief (bijv. 21%) en controleer het automatisch berekende BTW-bedrag.",
        expectedResult: "Profit berekent automatisch het BTW-bedrag op basis van het geselecteerde tarief; het factuurtotaal inclusief BTW wordt correct weergegeven in het scherm.",
      },
      {
        title: "Factuur genereren",
        instruction: "Klik op de actie 'Genereren factuur' om de verkoopfactuur te finaliseren en een PDF-document aan te maken.",
        expectedResult: "De factuur krijgt een uniek factuurnummer en de status verandert naar 'Gegenereerd'; de PDF-weergave van de factuur is beschikbaar via het document.",
      },
      {
        title: "Verkoopfactuur financieel doorboeken",
        instruction: "Ga naar Financieel > Boeken > Dagboek, selecteer het verkoopboek en kies de actie 'Doorboeken verkoopfacturen' voor de betreffende periode.",
        expectedResult: "Profit boekt de verkoopfactuur door naar het grootboek via een debetboeking op de debiteurenrekening en een creditboeking op de omzetrekening inclusief BTW-rekening.",
      },
      {
        title: "Factuur in openstaande posten controleren",
        instruction: "Ga naar Financieel > Debiteuren > Openstaande posten en zoek de zojuist geboekte factuur op bij de betreffende debiteur.",
        expectedResult: "De verkoopfactuur is zichtbaar in de openstaande posten met het correcte factuurbedrag, de factuurdatum en de berekende vervaldatum.",
      },
    ],
  },
  {
    key: "FIN_BETALINGEN",
    name: "Betaalbatch aanmaken en SEPA-bestand exporteren",
    category: "FIN",
    description: "Test het samenstellen van een betaalopdracht voor crediteuren, het aanmaken van een SEPA-betaalbestand en de verwerking via de bankkoppeling in AFAS Profit.",
    steps: [
      {
        title: "Betaalopdracht aanmaken",
        instruction: "Ga naar Financieel > Crediteuren > Betaalopdracht en klik op 'Nieuw' om een nieuwe betaalopdracht aan te maken met betaalwijze 'Betalingen in basisvaluta' en de gewenste betaaldatum.",
        expectedResult: "Profit opent het invoerscherm voor een betaalopdracht; de betaalwijze en betaaldatum zijn ingesteld en de selectie van openstaande posten is beschikbaar.",
      },
      {
        title: "Openstaande posten selecteren",
        instruction: "Selecteer in de betaalopdracht de openstaande crediteurfacturen met een vervaldatum tot en met de gekozen betaaldatum en klik op 'Toevoegen' om ze op te nemen in de batch.",
        expectedResult: "De geselecteerde facturen worden toegevoegd aan de betaalopdracht; het totale te betalen bedrag wordt per crediteur en als eindtotaal weergegeven.",
      },
      {
        title: "IBAN en BIC-code controleren",
        instruction: "Controleer bij elke crediteur in de betaalopdracht of een geldig IBAN en BIC-code zijn vastgelegd via Financieel > Crediteuren > Crediteur op de tab 'Bankrekeningen'.",
        expectedResult: "Alle crediteuren in de betaalopdracht beschikken over een geldig IBAN en BIC-code; Profit toont een waarschuwing voor crediteuren zonder bankrekeninggegevens.",
      },
      {
        title: "SEPA-betaalbestand genereren",
        instruction: "Selecteer de betaalopdracht en kies de actie 'Verwerken betaalopdracht' om een SEPA-XML-betaalbestand te genereren voor aanbieding aan de bank.",
        expectedResult: "Profit genereert een SEPA-XML-betaalbestand; de betaalopdracht krijgt de status 'Verwerkt' en het betaalbestand is beschikbaar voor download en aanbieding aan de bank.",
      },
      {
        title: "Betaling verwerken in bankboek",
        instruction: "Ga naar Financieel > Boeken > Bankboek en verwerk het ontvangen bankafschrift om de betaalde posten af te boeken op de openstaande crediteurfacturen.",
        expectedResult: "De betaalde facturen worden correct afgeboekt; de openstaande posten van de betreffende crediteuren tonen een saldo van nul voor de verwerkte facturen.",
      },
    ],
  },
  {
    key: "FIN_BTW",
    name: "BTW-aangifte opstellen en indienen",
    category: "FIN",
    description: "Test het opstellen, controleren en elektronisch indienen van een BTW/ICP-aangifte voor een aangiftetijdvak in AFAS Profit Financieel.",
    steps: [
      {
        title: "BTW-aangifte aanmaken voor tijdvak",
        instruction: "Ga naar Financieel > Btw/icp > Btw/icp-aangifte en klik op 'Nieuw' om een aangifte aan te maken voor het gewenste aangiftetijdvak (maand of kwartaal).",
        expectedResult: "Profit opent het aangifte-invoerscherm met het geselecteerde tijdvak; de BTW-bedragen per rubriek worden automatisch opgehaald uit de geboekte mutaties.",
      },
      {
        title: "BTW-bedragen per rubriek controleren",
        instruction: "Controleer in de BTW-aangifte de bedragen per rubriek (1a t/m 5g) door deze te vergelijken met de BTW-specificatierapportage via Financieel > Rapportages > BTW-specificatie.",
        expectedResult: "De bedragen in de BTW-aangifte sluiten aan op de BTW-specificatie; eventuele afwijkingen zijn inzichtelijk als verschil en vereisen een correctie voor indiening.",
      },
      {
        title: "Fiscale eenheid BTW samenvoegen",
        instruction: "Indien er sprake is van een fiscale eenheid, ga naar Financieel > Btw/icp > Btw/icp-aangifte Fiscale Eenheid en voeg de deelangiften van alle administraties samen in de hoofdadministratie.",
        expectedResult: "Profit consolideert de BTW-bedragen van alle administraties binnen de fiscale eenheid tot een gecombineerde aangifte; de totaalbedragen van de deelangiften zijn zichtbaar.",
      },
      {
        title: "BTW-aangifte autoriseren en indienen",
        instruction: "Selecteer de opgestelde BTW-aangifte en kies de actie 'Indienen' om de aangifte elektronisch te versturen naar de Belastingdienst.",
        expectedResult: "De BTW-aangifte wordt ingediend; Profit registreert de indiendatum en de aangifte krijgt de status 'Ingediend'.",
      },
      {
        title: "BTW-afdracht boeken",
        instruction: "Boek na de indiening de BTW-afdracht of -teruggaaf via Financieel > Boeken > Memoriaal op de BTW-afdrachtsrekening en de bankrekening.",
        expectedResult: "De BTW-afdracht of -teruggaaf is geboekt; de BTW-balansrekening toont na verwerking een saldo van nul voor het afgesloten aangiftetijdvak.",
      },
    ],
  },
  {
    key: "FIN_KOSTEN",
    name: "Kostenverdeling via kostenplaatsen en kostendragers",
    category: "FIN",
    description: "Test het toewijzen van kosten en opbrengsten aan kostenplaatsen en kostendragers (verbijzondering) bij het boeken en rapporteren in AFAS Profit Financieel.",
    steps: [
      {
        title: "Kostenplaatsen en kostendragers controleren",
        instruction: "Ga naar Financieel > Inrichting > Verbijzondering en controleer of de benodigde kostenplaatsen en kostendragers zijn aangemaakt met de status 'Actief'.",
        expectedResult: "De kostenplaatsen en kostendragers zijn aanwezig in het overzicht met de juiste codes, omschrijvingen en de status 'Actief'.",
      },
      {
        title: "Boeking met verbijzondering invoeren",
        instruction: "Ga naar Financieel > Boeken > Memoriaal en voer een journaalpost in op een kostenrekening; vul de kostenplaats en kostendrager in via de verbijzonderingsvelden op de boekingsregel.",
        expectedResult: "Profit accepteert de boeking met de opgegeven kostenplaats en kostendrager; de journaalpost is opgeslagen met de dimensiegegevens zichtbaar op de boekingsregel.",
      },
      {
        title: "Verbijzondering op boeking controleren",
        instruction: "Open de geboekte journaalpost via Financieel > Boeken > Financiele mutaties raadplegen en bekijk de verbijzonderingsdetails op de betreffende boekingsregel.",
        expectedResult: "De kostenplaats en kostendrager zijn correct gekoppeld aan de boekingsregel en zijn zichtbaar in het detailscherm van de financiele mutatie.",
      },
      {
        title: "Kostenplaatsrapportage genereren",
        instruction: "Ga naar Financieel > Rapportages > Verbijzondering en genereer een overzicht voor de gebruikte kostenplaats over de huidige periode.",
        expectedResult: "De rapportage toont alle boekingen op de geselecteerde kostenplaats met een opsplitsing naar kostendrager, grootboekrekening en bedrag.",
      },
      {
        title: "Budget versus realisatie per kostenplaats",
        instruction: "Ga naar Financieel > Rapportages > Budget versus realisatie en filter op de betreffende kostenplaats om werkelijke kosten te vergelijken met het vastgestelde budget.",
        expectedResult: "Het rapport toont per grootboekrekening het budget, de realisatie en het verschil; de zojuist geboekte kosten zijn verwerkt in de realisatiekolom.",
      },
    ],
  },
  {
    key: "FIN_RAPPORTAGES",
    name: "Financiele rapportages en jaarrekening samenstellen",
    category: "FIN",
    description: "Test het genereren van de balans, resultatenrekening en jaarrekening via de rapportagecockpit in AFAS Profit Financieel.",
    steps: [
      {
        title: "Rapportagecockpit openen",
        instruction: "Ga naar Financieel > Rapportages > Rapportagecockpit en selecteer de juiste administratie en de gewenste rapportageperiode.",
        expectedResult: "De rapportagecockpit opent met een overzicht van beschikbare financiele rapporten voor de geselecteerde administratie en periode.",
      },
      {
        title: "Balans genereren",
        instruction: "Kies in de rapportagecockpit het rapport 'Balans' en genereer het rapport voor de geselecteerde periode; controleer of activa en passiva in evenwicht zijn.",
        expectedResult: "De balans wordt gegenereerd met vaste activa, vlottende activa, eigen vermogen en vreemd vermogen; het balanstotaal activa is gelijk aan het balanstotaal passiva.",
      },
      {
        title: "Resultatenrekening genereren",
        instruction: "Kies in de rapportagecockpit het rapport 'Winst- en verliesrekening' en genereer het rapport voor de gewenste periode.",
        expectedResult: "De resultatenrekening toont een correcte opsplitsing van omzetcategorieen en kostencategorieen; het nettoresultaat sluit aan op de mutatie eigen vermogen in de balans.",
      },
      {
        title: "Jaarrekening samenstellen",
        instruction: "Ga naar Financieel > Rapportages > Jaarrekening en genereer de jaarrekening inclusief toelichting op de balans en toelichting op de winst- en verliesrekening voor het boekjaar.",
        expectedResult: "De jaarrekening wordt gegenereerd met balans, resultatenrekening en de bijbehorende toelichtingen; alle grootboekrekeningen zijn via rapportagecodes correct ingedeeld.",
      },
      {
        title: "Controlelijsten jaarovergang raadplegen",
        instruction: "Ga naar Financieel > Jaarovergang > Controlelijsten en genereer de overzichten voor openstaande posten en niet-geboekte mutaties ter voorbereiding op de jaarovergang.",
        expectedResult: "De controlelijsten tonen geen onverwachte openstaande posten of niet-geboekte mutaties; de administratie is gereed voor de jaarovergang.",
      },
    ],
  },
  {
    key: "FIN_ABO",
    name: "Abonnementsfacturen periodiek genereren",
    category: "FIN",
    description: "Test het beheren van abonnementen, het periodiek genereren van abonnementsfacturen en de automatische financiele verwerking in AFAS Profit.",
    steps: [
      {
        title: "Abonnement aanmaken voor debiteur",
        instruction: "Ga naar Ordermanagement > Abonnementen > Abonnement en klik op 'Nieuw' om een abonnement aan te maken voor een bestaande debiteur met een facturatiecyclus (bijv. maandelijks) en een ingangsdatum.",
        expectedResult: "Het abonnement wordt opgeslagen met de juiste debiteur, facturatiecyclus, het te factureren bedrag en de ingangsdatum; de status van het abonnement is 'Actief'.",
      },
      {
        title: "Abonnementsregels en tarieven invoeren",
        instruction: "Voeg in het abonnement regels toe met artikelcodes of omschrijvingen, aantallen, eenheidsprijzen en het van toepassing zijnde BTW-tarief.",
        expectedResult: "De abonnementsregels zijn opgeslagen; Profit berekent het periodieke factuurbedrag inclusief BTW correct op basis van de ingevoerde regels.",
      },
      {
        title: "Periodieke abonnementsfacturen genereren",
        instruction: "Ga naar Ordermanagement > Abonnementen > Abonnementsfacturen genereren, selecteer de facturatieperiode en klik op 'Genereren' om facturen aan te maken voor alle abonnementen waarvan de cyclus is verstreken.",
        expectedResult: "Profit genereert abonnementsfacturen voor alle in aanmerking komende abonnementen; het aantal gegenereerde facturen en het totaalbedrag worden getoond na afloop van de actie.",
      },
      {
        title: "Gegenereerde facturen controleren",
        instruction: "Ga naar Ordermanagement > Abonnementen > Abonnementsfacturen en controleer de zojuist gegenereerde facturen op juistheid van bedrag, BTW-tarief en debiteurnaam.",
        expectedResult: "De abonnementsfacturen zijn aanwezig met de status 'Gegenereerd'; bedragen, BTW-tarieven en debiteurnamen zijn correct overgenomen vanuit het abonnement.",
      },
      {
        title: "Abonnementsfacturen financieel doorboeken",
        instruction: "Ga naar Financieel > Boeken > Dagboek, selecteer het verkoopboek en kies de actie 'Doorboeken verkoopfacturen' om de abonnementsfacturen naar het financieel grootboek te boeken.",
        expectedResult: "De abonnementsfacturen zijn geboekt in het verkoopboek; de debiteurenrekening en omzetrekening zijn correct bijgewerkt en de facturen zijn zichtbaar in de openstaande posten.",
      },
    ],
  },
];
