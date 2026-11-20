/**
 * Store policies — text supplied by the owner (copied verbatim from Vevvion Wellness's own site,
 * https://ecom365-lovat.vercel.app/policies, on 2026-11-20). Do not reword legal text without the owner.
 * Rendered by /policies, /policies/[slug] and linked from the footer.
 */
export type Block = string | { list: string[] };
export type LegalSection = { heading?: string; blocks: Block[] };
export type LegalPage = { slug: string; title: string; summary: string; sections: LegalSection[] };

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "terms-and-conditions",
    title: "Terms and Conditions",
    summary: "The rules for using the Vevvion Stores website.",
    sections: [
      {
        heading: "Welcome to Vevvion Stores",
        blocks: [
          "Welcome to Vevvion Stores. These terms and conditions outline the rules and regulations for the use of Vevvion Store’s (VEVVION WELLNESS PRIVATE LIMITED) Website (www.myvevvion.com). Vevvion Stores is located at Bangalore, India (The detailed Address is mentioned on our Website).",
          "By accessing this website, we assume you accept these terms and conditions in full. Do not continue to use Vevvion Stores’s website if you do not accept all of the terms and conditions stated on this page.",
        ],
      },
      {
        heading: "Terminology",
        blocks: [
          "The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and any or all Agreements: Client, You and Your refers to you, the person accessing this website and accepting the Company’s terms and conditions. The Company, Ourselves, We, Our and Us, refers to our Company. Party, Parties, or Us, refers to both the Client and ourselves, or either the Client or ourselves.",
          "All terms refer to the offer, acceptance, and consideration of payment necessary to undertake the process of our assistance to the Client in the most appropriate manner, whether by formal meetings of a fixed duration, or any other means, for the express purpose of meeting the Client’s needs in respect of provision of the Company’s stated services/products, in accordance with and subject to, prevailing law of (Address).",
        ],
      },
      {
        heading: "Cookies",
        blocks: [
          "We employ the use of cookies. By using Vevvion Store’s website, you consent to the use of cookies in accordance with Vevvion Store’s privacy policy. Most of the modern-day interactive websites use cookies to enable us to retrieve user details for each visit.",
          "Cookies are used in some areas of our site to enable the functionality of this area and ease of use for those people visiting. Some of our affiliate/advertising partners may also use cookies.",
        ],
      },
      {
        heading: "License",
        blocks: [
          "Unless otherwise stated, Vevvion Store’s and/or its licensors own the intellectual property rights for all material on Vevvion Store’s.",
          "All intellectual property rights are reserved. You may view and/or print pages from (www.myvevvion.com) for your own personal use subject to restrictions set in these terms and conditions.",
          "You must not:",
          {
            list: [
              "Republish material from (www.myvevvion.com).",
              "Sell, rent, or sub-license material from (www.myvevvion.com).",
              "Reproduce, duplicate or copy material from (www.myvevvion.com).",
              "Redistribute content from Vevvion Store’s (unless content is specifically made for redistribution).",
            ],
          },
        ],
      },
      {
        heading: "Disclaimer",
        blocks: [
          "To the maximum extent permitted by applicable law, we exclude all representations, warranties, and conditions relating to our website and the use of this website (including, without limitation, any warranties implied by law in respect of satisfactory quality, fitness for purpose, and/or the use of reasonable care and skill).",
          "Nothing in this disclaimer will:",
          {
            list: [
              "Limit or exclude our or your liability for death or personal injury resulting from negligence.",
              "Limit or exclude our or your liability for fraud or fraudulent misrepresentation.",
              "Limit any of our or your liabilities in any way that is not permitted under applicable law.",
              "Or exclude any of our or your liabilities that may not be excluded under applicable law.",
            ],
          },
          "The limitations and exclusions of liability set out in this Section and elsewhere in this disclaimer:",
          {
            list: [
              "Are subject to the preceding paragraph; and",
              "Govern all liabilities arising under the disclaimer or in relation to the subject matter of this disclaimer, including liabilities that arise in contract, tort (including negligence), and for breach of statutory duty.",
            ],
          },
          "To the extent that the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary: "How we use and protect the information you share with us.",
    sections: [
      {
        blocks: [
          "This privacy policy sets out how M/s Vevvion Wellness Pvt Ltd. uses and protects any information that you give when you use this website. M/s Vevvion Wellness Pvt Ltd ensures that your privacy is protected.",
          "M/s Vevvion Wellness Pvt Ltd. may change this policy from time to time by updating this page. You should check this page from time to time to ensure that you are happy with any changes. Here, M/s Vevvion Wellness Private Limited declare that any other personal information through the company website and company App of our customers/Users is solely meant for company administration purpose and not for any other means.",
          "M/s Vevvion Wellness Pvt. Ltd., are committed to ensuring that your information is secure. In order to prevent unauthorized access or disclosure, we have put in place suitable physical, electronic and managerial procedures to safeguard and secure the information we collect online.",
        ],
      },
    ],
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    summary: "Important information about our products and your health.",
    sections: [
      {
        blocks: [
          "The information about our products as available in our health guide / website are not intended to prevent, diagnose, treat or cure any disease. This information is intended as an introduction to value addition in life through supplements.",
          "Our products aim at maintaining holistic balance in body and immunity level but are no way substitute of physician's diagnosis or Treatment. You need to consult your doctor about your health conditions and use our supplements for value addition in life. Any product used in excessive amount will /may invite problems.",
          "M/s Vevvion Wellness Pvt. Ltd., and/or the Trade Mark owners of the products shall be responsible for the quality of the products, only, if such products are bought from authorised distributors.",
          "The buyer shall be solely responsible for all consequences for the purchase and use of products bought from unauthorized sources including unauthorized websites, ecommerce marketplace or unauthorised party(ies).",
        ],
      },
    ],
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    summary: "Returns, exchanges, cancellations and refunds.",
    sections: [
      {
        blocks: [
          "In case of any dissatisfaction, or due to manufacturing or packaging defect, customers/Distributors have to intimate to the company about the return/exchange the product(s) within five days from the date of Invoice.",
          "The customers/Distributors must contact the Company from whom they had purchased the same, within 30 days from the date of purchase. They have to provide a valid reason in written and return the said products along with the original customer order receipt copy / invoice.",
          "Cancellation can be done within 30 days from the Order date and Refund will be made after deduction of necessary processing charges.",
        ],
      },
    ],
  },
  {
    slug: "statutory-warning",
    title: "Statutory Warning",
    summary: "Buy genuine Vevvion products only from authorised channels.",
    sections: [
      {
        blocks: [
          "This is to notify all concerned as well as general public that M/s Vevvion Wellness Pvt. Ltd., is in the business of Trading and marketing of Health Promotion Products and is entitled to the Trademark of M/s Vevvion Wellness Pvt. Ltd.",
          "M/s Vevvion Wellness Pvt Ltd has channelized its marketing and distribution of the products ONLY through its Distributors / Website (www.myvevvion.com). M/s Vevvion Wellness Pvt. Ltd., does not want to face fraudulent tampering of barcodes on the labels of its product and are selling Vevvion Wellness Products through any e-commerce channels.",
          "Making unlawful business gains, dishonesty in an unmetrical manner, by some unscrupulous persons may cause immense damage to the name and reputation of M/s Vevvion Wellness Pvt. Ltd. All concerned / public in general are advised and cautioned not to get carried away by the words/promises of dishonest persons who offer products with unusual discounts or monetary benefits in any manner for Vevvion Wellness products with tampered labels.",
        ],
      },
    ],
  },
  {
    slug: "shipping-and-delivery",
    title: "Shipping and Delivery",
    summary: "Dispatch times, delivery and shipping charges.",
    sections: [
      {
        blocks: [
          "Orders will be shipped within 7 working days or as per the delivery date agreed at the time of order confirmation & delivering of the shipment subject to Courier Company / post office norms. For a given place of delivery, it may be done on the next working day or may take 7 working days depending on the availability of Fresh Stocks / Distance from the Place to Central Warehouse.",
          "The product(s) shall be dispatched to the address provided by you at the time of placing the order. If the wrong delivery address is mentioned, and the product has been returned to the company address, the company shall charge extra for the second delivery attempt.",
          "Shipment charges will vary based on the bill amount as mentioned/intimated to the customers from time to time. No extra charges on delivery of product(s) are charged if the product(s) are picked up from Vevvion Wellness facilitator outlets.",
        ],
      },
    ],
  },
];

export const getLegalPage = (slug: string) => LEGAL_PAGES.find((p) => p.slug === slug);

export const ABOUT_PARAGRAPHS = [
  "Vevvion Wellness Pvt Ltd deals in the most effective and highest rated healthcare products, with a vision of \"giving back to society a joyful and luxurious life.\" We are committed to helping people live better lives by offering quality products and opportunities for the future, and by sharing generously with the global community.",
  "With years of experience in the industry, we strive for business excellence, care for people and their communities, and concern for the environment. Our mission is to enhance the lives of billions of people by empowering everyone to improve their financial power and well-being.",
  "Thank you for choosing Vevvion Wellness Pvt Ltd as your trusted partner in health and happiness.",
];
