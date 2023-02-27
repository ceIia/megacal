import { faker } from "@faker-js/faker";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { signal } from "@preact/signals-react";
import clsx from "clsx";
import { FpsView } from "react-fps";

type Campaign = {
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
};

// build a list of 50 campaigns (start date (before 1 feb 2023), end date (after 1 march 2023), name)
const fetchCampaigns = (
  count: number,
  from: Date,
  to: Date
): Promise<Campaign[]> => {
  const campaigns = [...Array(count).keys()].map((i) => {
    const startDate = faker.date.between(from, to);

    return {
      name: faker.company.catchPhrase(),
      startDate: startDate,
      endDate: faker.date.between(startDate, to),
      color: faker.internet.color(),
    };
  });

  return new Promise((resolve) => {
    setTimeout(() => resolve(campaigns), 1500);
  });
};

const today = moment();
const sixMonthsBefore = [...Array(6).keys()]
  .map((i) => today.clone().subtract(i + 1, "month"))
  .reverse();
const twelveMonthsAfter = [...Array(12).keys()].map((i) =>
  today.clone().add(i + 1, "month")
);

const initialOffset = 150;
const daySize = (384 * 12) / 365;

const horizontalOffset = signal(initialOffset);
const currentOffset = signal(initialOffset);
const months = signal([...sixMonthsBefore, today, ...twelveMonthsAfter]);
const campaigns = signal<Campaign[]>([]);

const addMonths = (count: number, direction: "before" | "after") => {
  const newMonths = [...months.value]; // get current value of months array

  // Add the specified number of months to the front or back of the array
  for (let i = 1; i <= count; i++) {
    if (direction === "before") {
      newMonths.unshift(moment(newMonths[0]).subtract(1, "month"));
    } else {
      newMonths.push(moment(newMonths[newMonths.length - 1]).add(1, "month"));
    }
  }

  // Update signals with new state
  months.value = newMonths;

  // fetch new campaigns
  fetchCampaigns(
    10,
    direction === "before"
      ? newMonths[0].toDate()
      : newMonths[newMonths.length - 1].toDate(),
    direction === "before"
      ? newMonths[count].toDate()
      : newMonths[newMonths.length - 1 + count].toDate()
  ).then((fetchedCampaigns) => {
    campaigns.value = [...campaigns.value, ...fetchedCampaigns];
  });
};

function App() {
  const timelineContainer = useRef<HTMLDivElement>(null);

  const updateOffset = (offset: number) => {
    const firstMonthOffset = months.value[0].diff(today, "months") * 384;
    const lastMonthOffset =
      months.value[months.value.length - 1].diff(today, "months") * 384;

    const newOffset = offset + currentOffset.value;
    if (newOffset > -firstMonthOffset) {
      // prevent scrolling before the first month

      horizontalOffset.value = -firstMonthOffset;
    } else if (
      newOffset <
      -(lastMonthOffset - timelineContainer.current!.offsetWidth + 384)
    ) {
      // prevent scrolling after the last month

      horizontalOffset.value = -(
        (
          lastMonthOffset - // last month offset
          timelineContainer.current!.offsetWidth + // container width
          384
        ) // month width
      );
    } else {
      horizontalOffset.value = newOffset;
    }
  };

  useEffect(() => {
    fetchCampaigns(10, new Date(2023, 0, 1), new Date(2023, 5, 1)).then(
      (fetchedCampaigns) => {
        campaigns.value = fetchedCampaigns;
      }
    );

    function wheel(event: WheelEvent) {
      event.preventDefault();
      horizontalOffset.value += event.deltaX * -0.5;
    }

    // add event listeners
    window.addEventListener("wheel", wheel, { passive: false });
  }, []);

  const containerHeight = timelineContainer.current?.offsetHeight;

  return (
    <div className="w-screen h-screen bg-slate-900 p-4 select-none">
      <FpsView height={50} width={300} top={(containerHeight || 0) - 50} />
      <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl overflow-hidden flex">
        <div className="max-w-sm w-screen">
          <div className="border-r border-slate-700 border-solid h-full">
            <div className="divide-y divide-solid divide-slate-700">
              <div className="flex items-center h-14 -mt-[0.5px] p-2.5 gap-2.5">
                <button
                  className="bg-slate-700 rounded-lg text-slate-100 px-2 py-1"
                  onClick={() => (horizontalOffset.value = initialOffset)}
                >
                  Go to Today
                </button>
                <button
                  className="bg-slate-700 rounded-lg text-slate-100 px-2 py-1"
                  onClick={() => (horizontalOffset.value = initialOffset)}
                >
                  Month ⭥
                </button>
              </div>

              {campaigns.value.map((campaign) => (
                <CampaignLabel campaign={campaign} />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full h-full overflow-hidden" ref={timelineContainer}>
          <div className="relative h-full">
            <motion.div
              id="dragListener"
              className="inset-0 h-14 absolute z-10 border-b border-solid border-slate-700"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDrag={(_, { offset }) => updateOffset(offset.x)}
              onDragStart={() => (currentOffset.value = horizontalOffset.value)}
              onDragEnd={() => (currentOffset.value = horizontalOffset.value)}
            />

            <div className="flex relative">
              {months.value.map((month, index) => (
                <Month
                  month={month}
                  key={month.toISOString()}
                  index={index}
                  containerHeight={containerHeight || 0}
                />
              ))}
            </div>

            <div className="pt-12 w-full h-full">
              {campaigns.value.map((campaign, index) => (
                <CampaignSpan
                  key={campaign.name}
                  campaign={campaign}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const shouldObserve = (index: number) => {
  return index === 5 || index === months.value.length - 6;
};

function Month({
  month,
  index,
  containerHeight,
}: {
  month: moment.Moment;
  index: number;
  containerHeight: number;
}) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const month = moment(
          (entry.target as HTMLElement).dataset.month, // have to cast to HTMLElement because the type is Element
          "MMMM YYYY"
        );

        if (month.isBefore(today, "month")) addMonths(6, "before");
        else addMonths(6, "after");
      });
    },
    { threshold: 0.5 }
  );

  useEffect(() => {
    if (monthRef.current && shouldObserve(index)) {
      observer.observe(monthRef.current);
    } else if (monthRef.current) {
      observer.unobserve(monthRef.current);
    }

    return () => {
      if (monthRef.current) observer.unobserve(monthRef.current);
    };
  }, [index]);

  const monthRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="absolute w-96 flex-shrink-0 px-3.5 z-0 h-14"
      style={{
        left: horizontalOffset.value + month.diff(today, "months") * 384,
      }}
      id="month"
      data-month={month.format("MMMM YYYY")}
      ref={monthRef}
    >
      <p className="text-slate-300 font-medium pt-1">
        {month.format("MMMM")}
        <span className="text-slate-600 ml-1">{month.format("YYYY")}</span>
      </p>
      <div className="flex justify-between relative">
        {
          // horizontal list of days in the month below the month name
          // if the day is today, add a class of "bg-slate-700"
          new Array(month.daysInMonth()).fill(null).map((_, i) => {
            const day = month.clone().date(i + 1);
            const isToday = day.isSame(today, "day");
            const className = isToday
              ? "bg-slate-700 text-white"
              : "text-slate-300";

            return (
              <div
                className={clsx(
                  "w-2 h-2 pt-3 flex items-center justify-center text-sm flex-col relative z-40",
                  className,
                  i % 5 === 0 || isToday ? "opacity-100" : "opacity-0"
                )}
                key={day.toISOString()}
              >
                <p
                  className={clsx(
                    "px-3 py-0.5 w-7 text-sm flex items-center justify-center",
                    isToday && "bg-rose-900 rounded"
                  )}
                >
                  {day.format("D")}
                </p>
              </div>
            );
          })
        }

        {today.isSame(month, "month") && (
          <div
            // bar for today
            className="absolute"
            style={{
              left: today.date() * ((384 - 14 * 2) / month.daysInMonth()) - 1,
              height: containerHeight,
            }}
          >
            <div className="w-0 border-r-2 border-dashed border-slate-600 bg-slate-700 h-full" />
          </div>
        )}
      </div>

      <div
        className="flex absolute left-0 justify-between top-full"
        style={{
          width: monthRef.current?.clientWidth || 0,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          return (
            <div
              className={clsx(
                "w-px bg-slate-700 opacity-30",
                i === 0 && "-ml-px",
                i === 4 && "-mr-px"
              )}
              style={{ height: containerHeight }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CampaignSpan({
  campaign,
  index,
}: {
  campaign: Campaign;
  index: number;
}) {
  const duration = moment(campaign.endDate).diff(campaign.startDate, "days");

  return (
    <motion.div
      className="flex items-center justify-between px-2.5 w-full h-12 absolute p-1.5"
      key={campaign.name}
      style={{
        width: duration * daySize + 28,
        left: `${
          // based on the start date and the current offset, like the months
          moment(campaign.startDate).diff(
            today.clone().startOf("month"),
            "days"
          ) *
            daySize +
          horizontalOffset.value
        }px`,
        top: `${
          // based on the index of the campaign in the array, like the months
          index * 48 + 56
        }px`,
      }}
      initial={{ opacity: 0, x: -5 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: {
          ease: "anticipate",
          duration: 0.4,
          delay: 0.05,
        },
      }}
    >
      <motion.div
        className="rounded-lg border-2 border-solid h-full w-full flex items-center pl-2 transition-colors duration-200 ease-in-out group cursor-pointer"
        style={{
          borderColor: campaign.color,
          backgroundColor: `${campaign.color}30`,
        }}
        whileHover={{ backgroundColor: campaign.color }}
      >
        <p className="text-slate-400 truncate -mt-px text-sm font-medium group-hover:text-white transition-colors duration-200 ease-in-out">
          {campaign.name}
          <span className="ml-2 font-normal text-slate-500 group-hover:text-slate-200 transition-colors duration-200 ease-in-out">
            {moment(campaign.startDate).format("MMM D")} -{" "}
            {moment(campaign.endDate).format("MMM D")}
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
}

function CampaignLabel({ campaign }: { campaign: Campaign }) {
  return (
    <motion.div
      className="flex items-center px-4 w-full h-12 relative"
      key={campaign.name}
      initial={{ opacity: 0, x: -5 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: {
          ease: "anticipate",
          duration: 0.4,
        },
      }}
    >
      <div
        className="w-2 h-2 rounded-full bg-slate-100 mr-4 flex-shrink-0"
        style={{
          backgroundColor: campaign.color,
        }}
      />
      <span className="text-slate-200 truncate">{campaign.name}</span>
    </motion.div>
  );
}

export default App;
