import { useCallback, useEffect, useMemo, useState } from "react";
import {
    RiHome5Line,
    RiServiceLine,
    RiListCheck3,
    RiInformationLine,
    RiPhoneLine,
    RiBuildingLine,
    RiMapPinLine,
} from "react-icons/ri";

import type { ActionType } from "../types/action";
import type { QuoteService } from "./Landing/RequestQuote";
import { useLanguage } from "../i18n";
import Navbar from "./Landing/Navbar";
import Hero from "./Landing/Hero";
import Tracking from "./Landing/Tracking";
import Services from "./Landing/Services";
import Commercial from "./Landing/Commercial";
import Partners from "./Landing/Partners";
import Process from "./Landing/Process";
import WhyLoveLaundry from "./Landing/WhyLoveLaundry";
import JoinWithUs from "./Landing/JoinWithUs";
import Testimonials from "./Landing/Testimonials";
import LocationMap from "./Landing/LocationMap";
import Contact from "./Landing/Contact";
import Footer from "./Landing/Footer";
import RequestQuote from "./Landing/RequestQuote";
import ActionBar from "../components/ActionBar";
import ChatWidget from "../components/ChatWidget";


const LandingPage = () => {
    const { t } = useLanguage();
    const [quoteService, setQuoteService] = useState<QuoteService>("counter");

    const openQuote = useCallback((service: QuoteService = "counter") => {
        setQuoteService(service);
        document.getElementById("quote")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, []);

    const actions: ActionType[] = useMemo(
        () => [
            {
                id: "home",
                label: t("actionHome"),
                icon: RiHome5Line,
            },
            {
                id: "services",
                label: t("actionServices"),
                icon: RiServiceLine,
            },
            {
                id: "commercial",
                label: t("actionCommercial"),
                icon: RiBuildingLine,
            },
            {
                id: "process",
                label: t("actionHowItWorks"),
                icon: RiListCheck3,
            },
            {
                id: "about",
                label: t("actionWhyUs"),
                icon: RiInformationLine,
            },
            {
                id: "locations",
                label: t("actionLocations"),
                icon: RiMapPinLine,
            },
            {
                id: "contact",
                label: t("actionContact"),
                icon: RiPhoneLine,
            },
        ],
        [t]
    );

    const [selectedItem, setSelectedItem] =
        useState<ActionType | null>(actions[0]);

    useEffect(() => {
        const handleScroll = () => {
            const sections = actions
                .map((action) => document.getElementById(action.id))
                .filter(Boolean);

            let current = actions[0];

            sections.forEach((section, index) => {
                if (!section) return;

                if (section.getBoundingClientRect().top <= 180) {
                    current = actions[index];
                }
            });

            setSelectedItem(current);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [actions]);

    return (
        <main className="site-page min-h-screen overflow-x-hidden bg-surface text-ink">

            <Navbar actions={actions} onQuote={openQuote}/>
            <Hero onQuote={openQuote} />
            <Tracking />
            <Services onQuote={openQuote} />
            <Commercial onQuote={openQuote} />
            <Partners />
            <Process onQuote={openQuote} />
            <WhyLoveLaundry />
            <RequestQuote service={quoteService} />
            <JoinWithUs />
            <Testimonials />
            <LocationMap />
            <Contact />
            <Footer onQuote={openQuote} />
            <ActionBar
                items={actions}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
            />
            <ChatWidget />
        </main>
    );
};

export default LandingPage;
