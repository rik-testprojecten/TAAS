import type { WorkflowTemplate } from "./types";

export const CRM_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "CRM_RELATIES",
    name: "Nieuwe relatie vastleggen",
    category: "ALG",
    description: "Test het aanmaken en beheren van organisaties, personen en prospects als relatie in AFAS Profit CRM, inclusief adresgegevens en relatietype.",
    steps: [
      {
        title: "Nieuwe organisatie aanmaken",
        instruction: "Ga naar CRM > Organisaties/personen > Organisatie/persoon, klik op 'Nieuw', selecteer 'Organisatie' en klik op 'Volgende'. Vul de organisatienaam, zoekcode en het relatietype (bijv. 'Prospect') in.",
        expectedResult: "De wizard toont het organisatieformulier met de velden Naam, Zoekcode en Relatietype. Na invullen en opslaan verschijnt de organisatie in de lijst."
      },
      {
        title: "Adres koppelen aan de organisatie",
        instruction: "Vink op het adresstap 'Adres vastleggen' aan, voer de postcode en het huisnummer in en druk op Tab. Controleer of straat en plaats automatisch worden overgenomen uit het adresbestand.",
        expectedResult: "AFAS Profit vult straat en woonplaats automatisch in op basis van de postcode. Het adres wordt zichtbaar opgeslagen op de organisatiekaart."
      },
      {
        title: "Contactpersoon koppelen",
        instruction: "Open de net aangemaakte organisatie, ga naar het tabblad 'Contactpersonen' en klik op 'Nieuw'. Voer de naam, aanspreektitel, functie en e-mailadres van de contactpersoon in en sla op.",
        expectedResult: "De contactpersoon is aangemaakt en zichtbaar gekoppeld aan de organisatie in het tabblad 'Contactpersonen'."
      },
      {
        title: "Relatietype wijzigen naar debiteur",
        instruction: "Open de organisatiekaart, klik op 'Bewerken' en wijzig het relatietype van 'Prospect' naar 'Verkooprelatie/Debiteur'. Vul het debiteurnummer of de debiteurgroep in en sla de wijziging op.",
        expectedResult: "De organisatie is als debiteur geregistreerd. Het debiteurnummer is zichtbaar op de kaart en de organisatie is terug te vinden in het debiteurenoverzicht."
      },
      {
        title: "Organisatie opzoeken en verifiëren",
        instruction: "Ga naar CRM > Organisaties/personen > Organisatie/persoon en zoek op de zoekcode of naam van de zojuist aangemaakte organisatie. Open de kaart en controleer alle geregistreerde gegevens.",
        expectedResult: "De organisatie is vindbaar via de zoekfunctie. Naam, adres, contactpersoon en relatietype komen overeen met de ingevoerde testgegevens."
      }
    ]
  },
  {
    key: "CRM_CONTACT",
    name: "Contactmoment registreren",
    category: "ALG",
    description: "Test het vastleggen van contactmomenten en communicatie bij een relatie in AFAS Profit CRM, inclusief gespreksverslag en opvolgactie.",
    steps: [
      {
        title: "Contactmoment aanmaken via de organisatiekaart",
        instruction: "Ga naar CRM > Organisaties/personen > Organisatie/persoon, open een bestaande relatie en klik in het tabblad 'Contactmomenten' op 'Nieuw'. Selecteer het contacttype (bijv. 'Telefonisch'), vul de datum en de betrokken contactpersoon in.",
        expectedResult: "Het contactmoment-formulier opent met de velden Datum, Contacttype, Medewerker en Contactpersoon. Het nieuwe contactmoment is na opslaan zichtbaar in het overzicht."
      },
      {
        title: "Gespreksverslag en bijlage toevoegen",
        instruction: "Vul in het veld 'Omschrijving' een korte samenvatting van het gesprek in (bijv. 'Besproken: verlengingsvoorstel contract 2026'). Voeg een bijlage toe via de bijlageknop en sla het contactmoment op.",
        expectedResult: "De omschrijving en de bijlage zijn zichtbaar opgeslagen bij het contactmoment. De bijlage is te openen vanuit het dossieritem."
      },
      {
        title: "Vervolgactie inplannen",
        instruction: "Vink in het contactmoment-formulier 'Volgend contactmoment inplannen' aan, stel een vervolgdatum in en wijs de verantwoordelijke medewerker toe. Sla het contactmoment op.",
        expectedResult: "Het geplande vervolgcontactmoment is aangemaakt en verschijnt als actiepunt in de agenda of takenlijst van de toegewezen medewerker."
      },
      {
        title: "Workflow starten vanuit contactmoment",
        instruction: "Controleer of bij het opslaan van het contactmoment automatisch een workflow wordt gestart (conform de CRM-inrichting). Navigeer naar de workflowinbox om de aangemaakte taak te bekijken.",
        expectedResult: "De workflow is gestart en een taak of melding is aangemaakt in de workflowinbox van de aangewezen medewerker, conform de ingerichte procedure."
      },
      {
        title: "Contactmomentenhistorie controleren",
        instruction: "Open de relatiemap van de organisatie en raadpleeg het tabblad 'Contactmomenten'. Controleer of alle geregistreerde contactmomenten chronologisch worden weergegeven.",
        expectedResult: "Alle contactmomenten van de relatie zijn zichtbaar in chronologische volgorde, inclusief datum, type, medewerker en omschrijving."
      }
    ]
  },
  {
    key: "CRM_VERKOOP",
    name: "Verkoopkans (forecast) beheren",
    category: "ALG",
    description: "Test het aanmaken en opvolgen van een verkoopkans in de AFAS Profit CRM-module Forecast, van lead tot offerte en afsluiting.",
    steps: [
      {
        title: "Nieuwe forecast aanmaken",
        instruction: "Ga naar CRM > Sales Automation > Forecast en klik op 'Nieuw'. Selecteer de bijbehorende organisatie, vul de omschrijving, het verwachte bedrag, de scoringskans (percentage) en de verwachte sluitingsdatum in.",
        expectedResult: "De forecast is aangemaakt en verschijnt in het forecast-overzicht met de ingevoerde gegevens, inclusief het gewogen bedrag (bedrag x scoringskans)."
      },
      {
        title: "Contactmoment registreren op de forecast",
        instruction: "Open de forecast-kaart en ga naar het tabblad 'Contactmomenten'. Voeg een nieuw contactmoment toe met het contacttype 'E-mail', de datum van vandaag en een korte omschrijving van de salesactiviteit.",
        expectedResult: "Het contactmoment is gekoppeld aan de forecast en zichtbaar in zowel de forecastkaart als de relatiemap van de organisatie."
      },
      {
        title: "Salesfase en scoringskans bijwerken",
        instruction: "Open de forecast en wijzig de salesfase (bijv. van 'Orientatie' naar 'Offertefase'). Pas de scoringskans aan naar 60% en werk de verwachte sluitingsdatum bij. Sla de wijzigingen op.",
        expectedResult: "De salesfase, scoringskans en sluitingsdatum zijn bijgewerkt. Het forecast-overzicht toont het herziene gewogen bedrag."
      },
      {
        title: "Offerte aanmaken vanuit de forecast",
        instruction: "Klik op de forecast-kaart op de actieknop 'Offerte aanmaken'. Controleer of de gegevens uit de voorcalculatie automatisch worden overgenomen in de offerte en of de bijbehorende workflow wordt gestart.",
        expectedResult: "Een offerte is aangemaakt als voorcalculatie en de workflow voor offertegoedkeuring is automatisch gestart. De offerte is zichtbaar gekoppeld op de forecastkaart."
      },
      {
        title: "Forecast afsluiten als gewonnen of verloren",
        instruction: "Open de forecast en klik op 'Afsluiten'. Selecteer de uitkomst 'Gewonnen' of 'Verloren', voer een reden in en bevestig de afsluiting.",
        expectedResult: "De forecast heeft de status 'Gewonnen' of 'Verloren' en is niet langer actief in het pipeline-overzicht. De rapportage in het forecast-dashboard is bijgewerkt."
      }
    ]
  },
  {
    key: "CRM_CAMPAGNES",
    name: "Campagne aanmaken en uitvoeren",
    category: "ALG",
    description: "Test het opzetten en uitvoeren van een marketingcampagne in AFAS Profit CRM, inclusief doelgroepselectie, campagneactie en e-mailmailing.",
    steps: [
      {
        title: "Nieuwe campagne aanmaken",
        instruction: "Ga naar CRM > Campagnebeheer > Campagne en klik op 'Nieuw'. Vul de campagnebeschrijving, het campagnetype, de startdatum en de einddatum in en sla de campagne op.",
        expectedResult: "De campagne is aangemaakt en verschijnt in het campagne-overzicht met de juiste omschrijving, type en datumrange."
      },
      {
        title: "Campagneactie toevoegen",
        instruction: "Open de campagne, ga naar het tabblad 'Campagneacties' en klik op 'Nieuw'. Kies het actietype 'E-mailmailing', geef de actie een naam en koppel het type dossieritem 'Uitgaande post' aan de actie.",
        expectedResult: "De campagneactie is aangemaakt en gekoppeld aan de campagne. Het gekoppelde type dossieritem is zichtbaar in de actiedetails."
      },
      {
        title: "Doelgroep bepalen via selectie",
        instruction: "Open de campagneactie en ga naar het tabblad 'Doelgroep'. Kies 'Algemene selectie' en filter op organisatie- of persoonsgegevens (bijv. alle contacten met relatietype 'Klant'). Sla de selectie op.",
        expectedResult: "De selectie is uitgevoerd en het resulterende aantal contactpersonen in de doelgroep is zichtbaar. De doelgroep is opgeslagen bij de campagneactie."
      },
      {
        title: "Campagneactie genereren",
        instruction: "Klik in de campagneactie op 'Genereren'. Controleer of per contactpersoon uit de doelgroep een dossieritem van het type 'Uitgaande post' wordt aangemaakt en of contacten zonder opt-in worden uitgesloten.",
        expectedResult: "Voor elk contact in de doelgroep met opt-in is een dossieritem aangemaakt. Contacten zonder opt-in zijn uitgesloten. De gegenereerde items zijn zichtbaar in het dossieroverzicht."
      },
      {
        title: "Campagneresultaat registreren",
        instruction: "Open een gegenereerd dossieritem na uitvoering van de campagneactie en registreer het resultaat (bijv. 'Respons ontvangen'). Bekijk het campagne-overzicht om de responsstatistieken te controleren.",
        expectedResult: "Het resultaat is vastgelegd op het dossieritem. Het campagne-overzicht toont een samenvatting van het aantal reacties en de respons per actie."
      }
    ]
  },
  {
    key: "CRM_DOSSIERS",
    name: "Klantdossier beheren",
    category: "ALG",
    description: "Test het aanmaken, raadplegen en delen van dossieritems in het AFAS Profit klantdossier, zowel via Profit als via InSite en OutSite.",
    steps: [
      {
        title: "Dossieritem aanmaken bij een relatie",
        instruction: "Ga naar CRM > Organisaties/personen > Organisatie/persoon, open een bestaande relatie en klik in het tabblad 'Dossier' op 'Nieuw'. Selecteer het type dossieritem 'Inkomende post', vul de omschrijving en de datum in en voeg een PDF-bijlage toe.",
        expectedResult: "Het dossieritem is aangemaakt en zichtbaar in het dossiertabblad van de relatie, met de juiste datum, omschrijving en de toegevoegde bijlage."
      },
      {
        title: "Dossieritem opzoeken via het dossieroverzicht",
        instruction: "Ga naar CRM > Dossier > Dossieritems en zoek op de relatie of het onderwerp van het zojuist aangemaakte dossieritem. Open het item en controleer de gegevens en bijlage.",
        expectedResult: "Het dossieritem is terug te vinden via de zoekfunctie. Alle velden (type, datum, omschrijving, bijlage) zijn correct weergegeven."
      },
      {
        title: "Dossieritem beschikbaar stellen via OutSite",
        instruction: "Open het dossieritem en activeer de optie 'Beschikbaar via OutSite' (afhankelijk van het ingestelde type dossieritem). Sla op en log in op de OutSite-omgeving als testklant om het item te controleren.",
        expectedResult: "Het dossieritem is zichtbaar in het klantenportaal (OutSite) van de betreffende organisatie. De klant kan de bijlage inzien en eventueel reageren."
      },
      {
        title: "Dossieritem raadplegen via InSite",
        instruction: "Log in op InSite als medewerker en navigeer naar de relatiepagina van de testorganisatie. Open het dossiertabblad en controleer of het dossieritem zichtbaar is inclusief bijlage.",
        expectedResult: "Het dossieritem is zichtbaar in InSite. De medewerker kan de bijlage openen en de dossierstatus inzien zonder in de Profit-client te werken."
      },
      {
        title: "Workflow starten vanuit dossieritem",
        instruction: "Open het dossieritem in Profit en controleer of bij het opslaan automatisch een workflow is gestart (indien geconfigureerd voor dit type dossieritem). Navigeer naar de workflowinbox om de bijbehorende taak te bevestigen.",
        expectedResult: "De workflow is automatisch gestart en een taak is aangemaakt in de inbox van de aangewezen medewerker. De taak bevat een verwijzing naar het betreffende dossieritem."
      }
    ]
  }
];
